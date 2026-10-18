function toggleCRT() {
    var overlay = document.getElementById('crt_overlay');
    var canvas = document.getElementById('canvas');
    var btn = document.getElementById('crt_toggle_btn');
    if (!overlay || !btn) return;

    if (overlay.classList.contains('crt-active')) {
        overlay.classList.remove('crt-active');
        if (canvas) canvas.classList.remove('crt-bloom');
        btn.value = 'CRT 滤镜: 关';
        btn.className = 'btn btn-outline-info';
    } else {
        overlay.classList.add('crt-active');
        if (canvas) canvas.classList.add('crt-bloom');
        btn.value = 'CRT 滤镜: 开';
        btn.className = 'btn btn-info';
    }
}

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

    if (container.requestFullscreen) {
        container.requestFullscreen();
    } else if (container.mozRequestFullScreen) {
        container.mozRequestFullScreen();
    } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
    } else if (container.msRequestFullscreen) {
        container.msRequestFullscreen();
    }
}

function exitAllFullscreen() {
    var container = document.getElementById('screen_container');
    var exitButton = document.getElementById('exit_button');
    if (container && container.classList.contains('html-fullscreen-container')) {
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
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        }
    }
}

document.addEventListener('fullscreenchange', function() {
    var exitButton = document.getElementById('exit_button');
    if (!exitButton) return;
    if (document.fullscreenElement) {
        exitButton.classList.add('exit_fullscreen_show');
    } else {
        var container = document.getElementById('screen_container');
        if (!container || !container.classList.contains('html-fullscreen-container')) {
            exitButton.classList.remove('exit_fullscreen_show');
        }
    }
});
