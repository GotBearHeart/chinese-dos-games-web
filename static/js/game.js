// === Fullscreen & CRT Controls ===

function htmlFullscreen() {
    var container = document.getElementById('screen_container');
    var exitButton = document.getElementById('exit_button');
    if (!container) return;

    if (container.classList.contains('html-fullscreen-container')) {
        container.classList.remove('html-fullscreen-container');
        if (exitButton) exitButton.classList.remove('exit_fullscreen_show');
    } else {
        container.classList.add('html-fullscreen-container');
        if (exitButton) exitButton.classList.add('exit_fullscreen_show');
    }
}

function nativeFullscreen() {
    var container = document.getElementById('screen_container');
    if (!container) return;

    if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.mozFullScreenElement) {
        if (container.requestFullscreen) {
            container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) {
            container.webkitRequestFullscreen();
        } else if (container.mozRequestFullScreen) {
            container.mozRequestFullScreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        }
    }
}

function exitAllFullscreen() {
    var container = document.getElementById('screen_container');
    var exitButton = document.getElementById('exit_button');
    if (container) {
        container.classList.remove('html-fullscreen-container');
    }
    if (exitButton) {
        exitButton.classList.remove('exit_fullscreen_show');
    }
    if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement) {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }
}

function toggleCRT() {
    var crtOverlay = document.getElementById('crt_overlay');
    var gameCanvas = document.getElementById('canvas');
    var crtBtn = document.getElementById('crt_toggle_btn');
    if (!crtOverlay) return;

    if (crtOverlay.classList.contains('crt-active')) {
        crtOverlay.classList.remove('crt-active');
        if (gameCanvas) gameCanvas.classList.remove('crt-bloom');
        if (crtBtn) {
            crtBtn.value = "CRT 滤镜: 关";
            crtBtn.classList.remove('btn-info');
            crtBtn.classList.add('btn-outline-secondary');
        }
        localStorage.setItem('dosgame_crt', 'off');
    } else {
        crtOverlay.classList.add('crt-active');
        if (gameCanvas) gameCanvas.classList.add('crt-bloom');
        if (crtBtn) {
            crtBtn.value = "CRT 滤镜: 开";
            crtBtn.classList.remove('btn-outline-secondary');
            crtBtn.classList.add('btn-info');
        }
        localStorage.setItem('dosgame_crt', 'on');
    }
}

// === Cloud Save Synchronization Engine (Write Hook + 15s Fast Polling + Manual) ===

var _lastUploadedSignature = '';
var _isSyncing = false;
var _saveDebounceTimer = null;

// Invoked directly from loader.js when deltaFS.writeFileSync or unlinkSync is called
window._triggerCloudSaveDebounced = function(filePath) {
    if (window._isRestoringCloudSaves) return;

    if (_saveDebounceTimer) {
        clearTimeout(_saveDebounceTimer);
    }

    var syncBtn = document.getElementById('cloud_sync_btn');
    if (syncBtn && !_isSyncing) {
        syncBtn.value = "☁️ 存盘写入，即将同步...";
        syncBtn.classList.remove('btn-outline-success', 'btn-outline-secondary');
        syncBtn.classList.add('btn-outline-warning');
    }

    _saveDebounceTimer = setTimeout(function() {
        _saveDebounceTimer = null;
        console.log("[CloudSave] File system write detected (" + filePath + "), auto-syncing to NAS...");
        syncSavesToNAS(false, false);
    }, 1500);
};

function collectDeltaFiles(fs, dir) {
    var files = {};
    function walk(current) {
        try {
            var list = fs.readdirSync(current);
            for (var i = 0; i < list.length; i++) {
                var name = list[i];
                if (name === '.' || name === '..') continue;
                var full = (current === '/' ? '' : current) + '/' + name;
                try {
                    var stat = fs.statSync(full);
                    if (stat.isDirectory()) {
                        walk(full);
                    } else if (stat.isFile()) {
                        var buf = fs.readFileSync(full);
                        var binary = '';
                        for (var b = 0; b < buf.length; b++) {
                            binary += String.fromCharCode(buf[b]);
                        }
                        files[full] = window.btoa(binary);
                    }
                } catch (se) {}
            }
        } catch (de) {}
    }
    walk(dir);
    return files;
}

function syncSavesToNAS(isKeepalive, isForce) {
    if (!window._dos_deltaFS || !window._dos_game_key || window._isRestoringCloudSaves) return;
    if (_isSyncing && !isKeepalive) return;

    var files = collectDeltaFiles(window._dos_deltaFS, '/');
    var fileCount = Object.keys(files).length;
    if (fileCount === 0) return;

    // Build signature to check if files actually changed
    var signature = '';
    var keys = Object.keys(files).sort();
    for (var k = 0; k < keys.length; k++) {
        signature += keys[k] + ':' + files[keys[k]].length + '|';
    }

    if (!isForce && signature === _lastUploadedSignature) {
        return;
    }

    var syncBtn = document.getElementById('cloud_sync_btn');
    if (syncBtn && !isKeepalive) {
        syncBtn.value = "☁️ 正在上传存档...";
    }

    _isSyncing = true;
    var payload = JSON.stringify({ files: files });
    var apiUrl = '/api/saves/' + encodeURIComponent(window._dos_game_key);

    try {
        // W3C sendBeacon and keepalive fetch have a strict 64KB quota.
        // If payload is <= 60000 bytes, sendBeacon is safe to use on exit.
        if (isKeepalive && navigator.sendBeacon && payload.length <= 60000) {
            var blob = new Blob([payload], { type: 'application/json' });
            var beaconSent = navigator.sendBeacon(apiUrl, blob);
            if (beaconSent) {
                _lastUploadedSignature = signature;
            }
            _isSyncing = false;
            return;
        }

        // For active sessions, standard fetch has NO 64KB limit and uploads full saves reliably.
        // Note: Do NOT set keepalive: true if payload > 60KB because Chromium throws TypeError.
        var useKeepalive = !!isKeepalive && payload.length <= 60000;

        fetch(apiUrl, {
            method: 'POST',
            keepalive: useKeepalive,
            headers: { 'Content-Type': 'application/json' },
            body: payload
        }).then(function(res) {
            return res.json();
        }).then(function(data) {
            _isSyncing = false;
            if (data && data.success) {
                _lastUploadedSignature = signature;
                var now = new Date();
                var timeStr = now.toTimeString().split(' ')[0];
                if (syncBtn) {
                    syncBtn.value = "☁️ 云存档: 已同步 (" + timeStr + ")";
                    syncBtn.classList.remove('btn-outline-warning', 'btn-outline-secondary');
                    syncBtn.classList.add('btn-outline-success');
                }
                console.log("[CloudSave] Synced " + data.saved_count + " files to NAS at " + timeStr);
            } else {
                if (syncBtn && !isKeepalive) {
                    syncBtn.value = "☁️ 存档同步失败";
                    syncBtn.classList.remove('btn-outline-success');
                    syncBtn.classList.add('btn-outline-warning');
                }
            }
        }).catch(function(err) {
            _isSyncing = false;
            console.warn("[CloudSave] Sync failed:", err);
            if (syncBtn && !isKeepalive) {
                syncBtn.value = "☁️ 存档同步失败";
                syncBtn.classList.remove('btn-outline-success');
                syncBtn.classList.add('btn-outline-warning');
            }
        });
    } catch (e) {
        _isSyncing = false;
        console.warn("[CloudSave] Sync exception:", e);
    }
}

function manualSyncSaves() {
    syncSavesToNAS(false, true);
}

// === Event Listeners & Timers ===

document.addEventListener('DOMContentLoaded', function() {
    var pref = localStorage.getItem('dosgame_crt');
    var crtOverlay = document.getElementById('crt_overlay');
    var gameCanvas = document.getElementById('canvas');
    var crtBtn = document.getElementById('crt_toggle_btn');

    if (pref === 'off') {
        if (crtOverlay) crtOverlay.classList.remove('crt-active');
        if (gameCanvas) gameCanvas.classList.remove('crt-bloom');
        if (crtBtn) {
            crtBtn.value = "CRT 滤镜: 关";
            crtBtn.classList.remove('btn-info');
            crtBtn.classList.add('btn-outline-secondary');
        }
    } else {
        if (crtOverlay) crtOverlay.classList.add('crt-active');
        if (gameCanvas) gameCanvas.classList.add('crt-bloom');
        if (crtBtn) {
            crtBtn.value = "CRT 滤镜: 开";
            crtBtn.classList.remove('btn-outline-secondary');
            crtBtn.classList.add('btn-info');
        }
    }

    // 15 秒轻量周期自动检查与保底上传（仅哈希比对，无实质 CPU 开销）
    setInterval(function() {
        syncSavesToNAS(false, false);
    }, 15000);
});

document.addEventListener('fullscreenchange', function() {
    var exitButton = document.getElementById('exit_button');
    if (!document.fullscreenElement) {
        var container = document.getElementById('screen_container');
        if (container && !container.classList.contains('html-fullscreen-container')) {
            if (exitButton) exitButton.classList.remove('exit_fullscreen_show');
        }
    }
});

document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
        syncSavesToNAS(true, false);
    }
});

window.addEventListener('beforeunload', function() {
    syncSavesToNAS(true, false);
});
