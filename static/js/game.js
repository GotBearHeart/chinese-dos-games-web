function htmlFullscreen() {
    var gameCanvas = document.getElementById('canvas');
    var exitButton = document.getElementById('exit_button')
    if (gameCanvas.classList.contains('html-fullscreen')) {
        gameCanvas.classList.remove('html-fullscreen');
        exitButton.classList.remove('exit_fullscreen_show');
    }
    else {
        gameCanvas.classList.add('html-fullscreen');
        exitButton.classList.add('exit_fullscreen_show');
    }
}

// === Cross-Device Cloud Save Client Sync Engine ===
var _lastUploadedFingerprint = "";
var _isSyncing = false;

function collectDeltaFiles(fs, dir) {
    var files = {};
    function walk(currDir) {
        try {
            var entries = fs.readdirSync(currDir);
            for (var i = 0; i < entries.length; i++) {
                var name = entries[i];
                if (name === '.' || name === '..') continue;
                var full = currDir === '/' ? '/' + name : currDir + '/' + name;
                var stat = fs.statSync(full);
                if (stat.isDirectory()) {
                    walk(full);
                } else if (stat.isFile()) {
                    var buf = fs.readFileSync(full);
                    var b64 = window.btoa(String.fromCharCode.apply(null, new Uint8Array(buf)));
                    files[full] = b64;
                }
            }
        } catch (e) {
            console.warn("[CloudSave] DeltaFS walk warning:", currDir, e);
        }
    }
    walk(dir);
    return files;
}

function syncSavesToNAS(isKeepalive, isForce) {
    if (!window._dos_deltaFS || !window._dos_game_key) return;
    if (_isSyncing && !isKeepalive) return;

    var files = collectDeltaFiles(window._dos_deltaFS, '/');
    var fileCount = Object.keys(files).length;
    if (fileCount === 0 && !isForce) return;

    var fingerprint = JSON.stringify(files);
    if (!isForce && fingerprint === _lastUploadedFingerprint) return;

    var url = '/api/saves/' + encodeURIComponent(window._dos_game_key);
    var payload = JSON.stringify({
        game: window._dos_game_key,
        files: files,
        timestamp: Date.now()
    });

    if (isKeepalive && navigator.sendBeacon) {
        var blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
        _lastUploadedFingerprint = fingerprint;
        return;
    }

    _isSyncing = true;
    var btn = document.getElementById('cloud_sync_btn');
    if (btn) {
        btn.value = '☁️ 云存档: 同步中...';
        btn.className = 'btn btn-outline-warning';
    }

    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: isKeepalive
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        _isSyncing = false;
        if (data && data.success) {
            _lastUploadedFingerprint = fingerprint;
            if (btn) {
                var now = new Date();
                var timeStr = now.toTimeString().split(' ')[0];
                btn.value = '☁️ 云存档: 已同步 (' + timeStr + ')';
                btn.className = 'btn btn-outline-success';
            }
            console.log('[CloudSave] Successfully synced ' + (data.saved_count || 0) + ' files to NAS');
        } else if (btn) {
            btn.value = '☁️ 云存档: 失败';
            btn.className = 'btn btn-outline-danger';
        }
    })
    .catch(function(err) {
        _isSyncing = false;
        if (btn) {
            btn.value = '☁️ 云存档: 网络错误';
            btn.className = 'btn btn-outline-danger';
        }
        console.warn('[CloudSave] Sync exception:', err);
    });
}

function manualSyncSaves() {
    syncSavesToNAS(false, true);
}

// 180 秒（3 分钟）周期自动检查与上传
setInterval(function() {
    syncSavesToNAS(false, false);
}, 180000);

document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
        syncSavesToNAS(true, false);
    }
});

window.addEventListener('beforeunload', function() {
    syncSavesToNAS(true, false);
});
