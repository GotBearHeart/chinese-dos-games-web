# Chinese DOS Games Web (Modern Community Edition) 🎮

[![GitHub stars](https://img.shields.io/github/stars/GotBearHeart/chinese-dos-games-web?style=social)](https://github.com/GotBearHeart/chinese-dos-games-web)
[![Docker Multi-Arch](https://img.shields.io/badge/Docker-Multi--Arch%20(amd64%20%2F%20arm64)-blue?logo=docker)](https://ghcr.io/gotbearheart/dosgame)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-green.svg)](https://www.gnu.org/licenses/gpl-3.0.html)

[中文文档](#中文文档) | [English Documentation](#english-documentation)

---

## 中文文档

本仓库是 [rwv/chinese-dos-games-web](https://github.com/rwv/chinese-dos-games-web)（原上游已于 2026 年 9 月归档为只读）的**现代化长期维护与功能增强版（Community Edition）**。

依托 HTML5 The Emularity + DOSBox Emscripten 技术，我们在原版基础上全面重构了 WebUI，引入了**跨设备云存档同步**、**纯 CSS 复古 CRT 滤镜**、**4:3 自适应海报墙**与**收藏夹系统**，为飞牛 OS (fnOS)、群晖 (Synology)、威联通 (QNAP) 及私有服务器用户提供开箱即用的复古游戏自建平台。

### ✨ 核心增强特性

* 🖼️ **4:3 黄金复古比例自适应海报墙**：
  - 彻底重构原始纯文字列表，自适应手机双列至桌面宽屏 5~8 列；
  - 引入浏览器原生 `loading="lazy"` 懒加载，在近 2,000 款游戏中保证 **稳定 60 FPS** 丝滑滚动；
  - 80ms 防抖算法的**毫秒级即时筛选框**，即打即显，无需刷新。
  - 独家定制复古 8-bit 绿字符像素卡带 SVG 容灾兜底（`onerror`），杜绝破损碎图。
* 📺 **零性能损耗纯 CSS CRT 显像管滤镜**：
  - 采用水平交错扫描线、径向暗角与高对比发光微光（Bloom），完美重现 90 年代老式大头电脑显示器质感；
  - 纯 CSS 复合渲染，**零 WebGL 显卡开销**，手机与低配设备久玩不发热、不掉帧；
  - 修复原生全屏脱离滤镜的容器 Bug，保持等比 4:3 居中并以黑边填充。
* ☁️ **跨设备 NAS 云存档全自动双向同步引擎**：
  - 连接虚拟磁盘 BrowserFS `deltaFS` 与宿主机物理存储；
  - **开机即玩**：启动游戏自动向服务端拉取最新存档，换电脑/手机免传输无缝继续进度；
  - **180 秒智能巡检**：定时比对存档文件指纹，仅在产生新进度时发起静默增量上传；
  - **切页/关页即时保底**：监听 `visibilitychange` 与 `beforeunload`，通过现代 `keepalive fetch` 确保存档零延迟落盘。
* ⭐ **跨设备心愿收藏夹 (Favorites) 系统**：
  - 游戏详情运行页醒目集成【★ 已收藏】/【☆ 收藏】秒级切换按钮，首屏服务端直接注资零闪烁；
  - 全局导航栏配备直达入口与专属收藏海报墙，数据物理落盘永久持久化，防清空缓存丢失。
* 🐳 **多架构 Docker 镜像与一键 NAS 部署**：
  - 原生支持 `linux/amd64` (x86 PC/NAS) 与 `linux/arm64` (树莓派/ARM NAS/Mac)；
  - 提供一键启动命令与 `docker-compose.yml`。

---

### 🚀 快速开始 (Docker 部署)

#### 1. 单行命令一键启动

```bash
docker run -d \
  --name dosgame \
  --restart unless-stopped \
  -p 8888:262 \
  -v /path/to/your/dosgame/bin:/app/static/games/bin:rw \
  -v /path/to/your/dosgame/img:/app/static/games/img:ro \
  -v /path/to/your/dosgame/saves:/app/saves:rw \
  ghcr.io/gotbearheart/dosgame:latest
```

* 服务端口：访问 `http://<你的NAS或服务器IP>:8888/` 即可开始游玩！
* 物理存档位置：所有游戏存档自动落盘在 `./saves/<游戏ID>/`，收藏数据保存在 `./saves/favorites.json`。

#### 2. Docker Compose 编排启动

创建 `docker-compose.yml`：
```yaml
version: '3.8'

services:
  dosgame:
    image: ghcr.io/gotbearheart/dosgame:latest
    container_name: dosgame
    restart: unless-stopped
    ports:
      - "8888:262"
    environment:
      - TITLE=Chinese DOS Games
      - WORKERS=4
    volumes:
      - ./bin:/app/static/games/bin:rw
      - ./img:/app/static/games/img:ro
      - ./saves:/app/saves:rw
```
启动：
```bash
docker compose up -d
```

---

### 🛠️ 本地 Python 开发运行

```bash
# 1. 克隆本仓库及其子模块
git clone --recursive https://github.com/GotBearHeart/chinese-dos-games-web.git
cd chinese-dos-games-web

# 2. 安装依赖
pip install -r requirements.txt

# 3. 下载游戏资源包 (如需全量体验近 2000 款游戏)
python3 ./static/games/download_data.py

# 4. 运行服务
python3 app.py
```

---

## English Documentation

This repository is an **actively maintained modern community edition** of [rwv/chinese-dos-games-web](https://github.com/rwv/chinese-dos-games-web) (which was archived as read-only by the original upstream owner in September 2026).

Built upon HTML5 The Emularity and DOSBox Emscripten, we have completely revamped the WebUI and added crucial quality-of-life enhancements for self-hosters and NAS enthusiasts.

### ✨ Key Enhancements

1. **4:3 Responsive Poster Grid Wall**: Modern card grid with native `loading="lazy"` (smooth 60 FPS over 1,800+ games) and 80ms debounced instant search filter.
2. **Zero-Overhead Pure CSS CRT Shader**: High-fidelity retro scanlines, vignette, and phosphor bloom with zero WebGL GPU strain.
3. **Cross-Device Cloud Saves Engine**: Bidirectional server-side save synchronization with pre-boot download, 180s dirty check interval, and `visibilitychange`/`beforeunload` keepalive sync.
4. **Cross-Device Favorites System**: Star/unstar favorite games directly from game pages with seamless multi-device persistence.
5. **Multi-Arch Docker Images**: Automated CI/CD builds for both `amd64` and `arm64` via GitHub Actions.

---

## 📜 鸣谢与许可 (Credits & License)

* **Upstream Project**: [rwv/chinese-dos-games](https://github.com/rwv/chinese-dos-games) & [rwv/chinese-dos-games-web](https://github.com/rwv/chinese-dos-games-web)
* **Emulator Cores**:
  - [dreamlayers/em-dosbox](https://github.com/dreamlayers/em-dosbox): An Emscripten port of DOSBox
  - [db48x/emularity](https://github.com/db48x/emularity): Easily embed emulators on the web
* **License**: [GNU General Public License v3.0 (GPLv3)](https://www.gnu.org/licenses/gpl-3.0.html)
