# 安装与使用说明

## 0. 先选一条路

| 你的目标 | 去哪儿 |
| --- | --- |
| 只想在浏览器里放一遍动画 | 双击 `assets/animation.html`，见 [§2](#2-只要动画本身不装-dsh) |
| 想剪一段 1280×720 的片子 | 播 `dist/dsh-sao-animation.mp4` |
| **让 DSH 启动时播这段动画** | [§1](#1-装进-deepseek-harness)，桌面端走插件面板，Web 走 CLI |
| 想改动画 / 重新出片 | [§3](#3-环境准备重新生成动画) + [§4](#4-工具速查) |
| 想换成自己的素材 | [§6](#6-用你自己的素材重做避免第三方版权) |

---

## 1. 装进 DeepSeek Harness

插件就是标准 npm 包（`package.json` + `lib/` + `assets/` + `cordis.patch.yml`），
**仓库根即包根**，所以三种装法任选。装完都要**重启一次** DSH
（客户端模块图与桌面注入表只在启动时收集一次）。

### 1.1 桌面端（官方 Desktop App）—— 推荐

1. 打开 DSH → **插件 / Plugins** → 添加插件
2. 安装源填其一：
   - `github:YaJing0412/dsh-sao-animation`（从 GitHub 拉）
   - 本仓库的**绝对路径**，例如 `D:\Tool\dsh-sao-animation`（本地源码，改完就能试）
3. 安装完成后**完全退出 DSH（含托盘）再启动**
4. 启动瞬间就能看到动画；设置里会多出 **SAO启动设置** 分区

> `desktop` 这个 profile 由官方客户端托管，**不建议**用 `dsh` CLI 直接改它
> （CLI 自己也会提示：需要先让 App 初始化过 profile，并完全退出后再操作）。

### 1.2 Web / CLI（`dsh web` 的 profile）

```powershell
dsh plugin --profile web add github:YaJing0412/dsh-sao-animation
```

`dsh` 不在 PATH 上时用完整路径调用：

```powershell
$dsh = "$env:LOCALAPPDATA\Programs\DeepSeek Harness\resources\app\dsh\node_modules\@deepseek-ai\dsh\lib\bin.js"
node $dsh plugin --profile web add github:YaJing0412/dsh-sao-animation
```

本地源码 / 改代码用本地路径（`link:` 语义，改完源码直接生效）：

```powershell
node $dsh plugin --profile web add "D:\Tool\dsh-sao-animation"
```

重启 `dsh web`；浏览器还加载着旧 bundle 时按 `Ctrl+Shift+R`。

> `dsh plugin …` 做的事就是「在 profile 目录里跑 pnpm」，并**自动同时维护**两处：
> `package.json` 的 `dependencies` 和 `dsh.profile.bundles`。所以不需要手工登记。

### 1.3 手动安装（兜底）

CLI 不可用、或想完全掌控时：

1. 把仓库放到任意目录，例如 `D:\Tool\dsh-sao-animation`
2. 编辑 `~/.dsh/profiles/<profile>/package.json`：

```jsonc
{
  "dependencies": {
    "dsh-sao-animation": "link:D:/Tool/dsh-sao-animation"     // 改代码用 link:；稳定用 file:
  },
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        "dsh-sao-animation"                                    // ← 追加到末尾
      ]
    }
  }
}
```

3. 在 profile 目录里装依赖（pnpm 走 DSH 自带的 shim 即可）：

```powershell
cd "$env:USERPROFILE\.dsh\profiles\web"
& "$env:USERPROFILE\.dsh\shims\pnpm.cmd" install
```

4. 重启对应的客户端。

`desktop` profile 同样改 `~/.dsh/profiles/desktop/package.json`，但**必须在 DSH 完全退出后**改。

### 1.4 验证装好了

| 检查 | 怎么做 |
| --- | --- |
| 依赖是否登记 | `dsh plugin --profile web why dsh-sao-animation` |
| profile 配置 | 看 `~/.dsh/profiles/<profile>/package.json` 的 `dependencies` + `dsh.profile.bundles` |
| 静态资源可达 | 打开 `http://127.0.0.1:<端口>/dsh-boot/animation.html`（端口看 `dsh web` 启动日志，或桌面端设置里显示的地址） |
| 配置接口 | 同域 `/dsh-boot/config` 返回一份 JSON |
| 设置页 | 设置里出现 **SAO启动设置** 分区 |
| 启动效果 | 重启后启动时播放；用 `#noboot` 跳过、`#boot` 强制重播 |

### 1.5 升级

```powershell
dsh plugin --profile web add github:YaJing0412/dsh-sao-animation   # 再跑一次即可拉新
```

桌面端在插件面板里点更新（或卸载后重装）。想钉住某个提交：
`github:YaJing0412/dsh-sao-animation#<commit-sha>`。

### 1.6 卸载

```powershell
dsh plugin --profile web remove dsh-sao-animation
```

桌面端在插件面板卸载。用户配置 `~/.dsh/dsh-sao-animation.json` 不会被删除，需要就手动删
（改名前的 `~/.dsh/dsh-boot-animation.json` 只是兼容读入，会在下一次保存时自动迁移）。

### 1.7 开发模式（改代码即时生效）

| 你改了什么 | 怎么生效 |
| --- | --- |
| `animation/`（动画源码） | `python tools/build.py` 重新生成 `assets/animation.html`，刷新页面即可（插件直接读该文件） |
| `lib/client.js` / `lib/client-dom.js` | HMR 正常时保存即生效；否则重载界面或重启客户端 |
| `lib/index.js`、`package.json`、`cordis.patch.yml` | 重启客户端（宿主启动时加载） |

本地 `link:` 安装时改 `lib/` 不需要重装；`file:` 安装是**打包副本**，改完必须重装或换 `link:`。

### 1.8 安装期常见问题

**`dsh: pnpm was not found; install pnpm and make it available on PATH.`**
装 pnpm，或把 DSH 自带的 shim 目录 `~/.dsh/shims` 加进 PATH 后用其中的 `pnpm.cmd`。

**`git-hosted plugins build on install via their prepare script, which pnpm blocks …`**
本插件**没有任何安装期构建脚本**（`assets/animation.html` 已随仓库提交），正常不会遇到。
只有你 fork 后自己加了 `prepare`/`postinstall` 才会 —— 按提示把 pnpm 打印的那个 key
加到 profile 的 `pnpm-workspace.yaml` 的 `allowBuilds` 下再重试。

**`dsh: to accept the risk, run: dsh plugin --profile <p> allow-version …`**
DSH 的版本门禁：插件声明/依赖的版本与当前运行时不完全匹配。确认你信任该版本后，按提示执行
`allow-version <pkg>@<ver> --dsh-version <ver> --accept-risk`。

**重启后没动画**
① 设置里「启用启动动画」是否关掉了；② 同一窗口会话只播一次（`sessionStorage` 的
`dsh-boot-played`），开新窗口或用 `#boot` 强制重播；③ 桌面端确认装进的是 `desktop` profile。

**桌面端装完没反应**
`desktop` profile 由 App 托管：请用插件面板安装，并确认 DSH **完全退出（含托盘）** 后再启动。

**设置页里没有「SAO启动设置」**
`package.json` 的 `dsh.client.platform` 必须是 `web`、`inject` 里要有
`@deepseek-ai/dsh-client-ui-settings`；桌面端还要靠 `lib/client-dom.js` 注入（见
[docs/PLUGIN.md](docs/PLUGIN.md)）。改过 `package.json` 记得重启。

---

## 2. 只要动画本身（不装 DSH）

| 想要什么 | 怎么做 |
| --- | --- |
| 浏览器里放一遍 | 双击 `assets/animation.html` —— 单文件，音轨已内联，可随意拷走 |
| 剪进视频 | 用 `dist/dsh-sao-animation.mp4` |
| 嵌进自己的页面 | `iframe` 加载，`?once=1` 播完会 `postMessage('dsh-boot-done')` |

操作与参数（`?t=`、`?hud=1`、`?once=1`、`?mute=1`、`?cfg=`）见
[README.md 的「动画本体」](README.md#动画本体可以完全脱离-dsh-用)。

**为什么源码版建议走 http://**：`animation/boot.html` 是拆开的四件套，5.45–6.45s 的笔触帧存在
`animation/blades.json`，浏览器不允许 `file://` 页面读取同目录 JSON，所以直接双击
`animation/boot.html` 时这一段会是空的。用 `python tools/serve.py` 打开即正常；
成品单文件版不受影响（笔触已内联）。

---

## 3. 环境准备（重新生成动画）

插件运行**不需要**这些；只有改动画、出片才需要。

| 组件 | 用途 | 安装 |
| --- | --- | --- |
| Python 3.9+ | 跑 `tools/` | [python.org](https://www.python.org/downloads/) |
| `opencv-python` + `numpy` | 抽帧、去角标、写 WebP/MP4 | `python -m pip install opencv-python numpy` |
| Chrome / Chromium / Edge | `capture.py` 无头截图 | 装任意一个 |
| ffmpeg | 抽帧、混音、H.264 重编码 | `winget install Gyan.FFmpeg` / `brew install ffmpeg` / `apt install ffmpeg` |

外部程序探测顺序：环境变量 → `PATH` → 常见安装位置。探测不到就指路：

```powershell
$env:CHROME = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$env:FFMPEG = "D:\ffmpeg\bin\ffmpeg.exe"
$env:DSH_FRAMES = "D:\work\frames"      # 截图输出目录，默认 %TEMP%\dsh-boot-frames
```

> 脚本的控制台输出是英文：Windows 控制台对 GBK / UTF-8 的处理不一致，非 ASCII 输出会变乱码。
> 仍然乱码就 `chcp 65001` 或设 `$env:PYTHONUTF8=1`。

重新生成：

```bash
python tools/build.py      # animation/* -> assets/animation.html（插件立即生效）
python tools/capture.py    # 408 帧 -> %TEMP%\dsh-boot-frames（约 70s）
python tools/refill.py     # 有丢帧就反复跑，直到 "missing: 0"
python tools/encode.py     # 裁黑边 -> dist/dsh-sao-animation-silent.mp4
python tools/mux_audio.py  # 混音 -> dist/dsh-sao-animation.mp4
```

`capture.py` 拍的是 1280×816 窗口（16:9 画面 + 上下黑边），`encode.py` 会自动量出黑边并裁掉，
输出严格 1280×720。

---

## 4. 工具速查

| 脚本 | 作用 | 常用命令 |
| --- | --- | --- |
| `tools/build.py` | 动画源码 → `assets/animation.html`（插件读的文件） | `python tools/build.py` |
| `tools/serve.py` | 本地 http 预览动画源码 | `python tools/serve.py [--port 8765] [--no-open]` |
| `tools/capture.py` | 无头 Chrome 逐帧截图 | `python tools/capture.py [--workers 6] [--at 4800,6000]` |
| `tools/refill.py` | 补拍丢帧 | `python tools/refill.py` |
| `tools/encode.py` | PNG 序列 → 无声 MP4（自动裁黑边 + ffmpeg 重编码） | `python tools/encode.py [--crf 17] [--check]` |
| `tools/mux_audio.py` | 混入音轨 | `python tools/mux_audio.py [--clip x.mp4 --ss 13.4 --t 13.6]` |
| `tools/extract_blades.py` | 从影片抽笔触帧 + 去角标 + 写 `blades.json` | `python tools/extract_blades.py --clip x.mp4 --ss 18.85 --t 1.0` |

几个好用的参数：

- `capture.py --at 4800,6000` —— 只拍这几个时刻（毫秒），调样式时几秒出对照图
- `capture.py --keep` —— 保留上一轮帧
- `encode.py --check` —— 抽检 6 帧写到帧目录旁边
- `extract_blades.py --delogo auto|none|x0,y0,x1,y1` —— 去角标区域（支持比例或像素）
- `extract_blades.py --mask-dump mask.png` —— 导出水印掩膜，调参先看它

`tools/history/` 是开发过程的一次性补丁脚本，**已全部应用到当前源码**，正常使用不需要跑。

---

## 5. 自定义

| 想改什么 | 改哪儿 |
| --- | --- |
| 文案 / 字号 / 颜色 / 音频 / 跳过键 | DSH 里 **设置 → SAO启动设置**（推荐，写进 `~/.dsh/dsh-sao-animation.json`） |
| 文案默认值 | `lib/index.js` 的 `DEFAULTS`（宿主）、`lib/client.js` 与 `lib/client-dom.js` 里的 `DEFAULT_CFG` |
| 动画里的文案默认值 | `animation/boot.js` 的 `const TXT = {...}` |
| 时长与各段起止 | `animation/boot.js` 顶部 `DURATION` 与 `const T = {...}`（毫秒）；出片时同步改 `capture.py --dur` |
| 配色 | `animation/boot.css` 顶部 `:root` 的 CSS 变量 |
| 字标 | 替换 `animation/brand.svg`（任意 SVG，`build.py` 会内联两次） |
| 笔触段 | 替换 `animation/blades.json`，或跑 `extract_blades.py` 重抽 |
| 音轨 | 替换 `animation/boot-audio.mp3`（建议 13.6s 左右） |
| 遮罩/兜底时间、DOM 注入细节 | `lib/client.js`、`lib/client-dom.js`（见 [docs/PLUGIN.md](docs/PLUGIN.md)） |

> 改完动画**务必**跑 `python tools/build.py`：`assets/` 是生成物，手改会在下次构建时被覆盖。
> 改完 `lib/` 或 `package.json` 记得重启客户端，并跑 `npm run check` 自检语法。

---

## 6. 用你自己的素材重做（避免第三方版权）

随附的音轨与 30 帧笔触来自一支第三方影片，见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
换成自己的素材：

```bash
# 1) 抽笔触段（自带去右下角角标；--delogo none 关掉）
python tools/extract_blades.py --clip my.mp4 --ss 18.85 --t 1.0 --frames 30 \
       --slot -1                      # --slot -1 = 只生成 blades.json，不动帧序列

# 2) 换音轨（截你自己影片的一段，或直接放自己的 mp3）
python tools/mux_audio.py --clip my.mp4 --ss 13.4 --t 13.6

# 3) 换字标：替换 animation/brand.svg

# 4) 重新生成动画 + 出片
python tools/build.py && python tools/capture.py && python tools/refill.py \
  && python tools/encode.py && python tools/mux_audio.py
```

`extract_blades.py` 会自己居中裁成 16:9 再缩放到 1280×720，2160×1080 / 1920×1080 / 3840×2160
都不用手动调参。想让抽出的帧**同时**替换 MP4 里对应的 30 帧，把 `--slot` 设为 164（默认），
它会把 PNG 写进帧目录的 `f0164.png…`（需先跑过 `capture.py`）。

---

## 7. FAQ（动画与出片）

**双击后没有声音**
浏览器自动播放策略。点页面任意处即可。`?mute=1` / `?audio=0` 会强制静音，别误用。

**源码版 5.45–6.45s 是空的**
`file://` 下浏览器不允许读同目录 `blades.json`。用 `tools/serve.py` 打开，或跑 `build.py` 用单文件版。

**`capture.py` 报找不到 Chrome / Edge**
装一个 Chromium 系浏览器，或设 `CHROME` 环境变量。

**Chrome 启动即退出，报 `crashpad_client_win.cc … OpenProcess: 拒绝访问 (0x5)`**
headless Chrome 要拉起自己的崩溃处理器，在受限沙箱/容器里会被拦。请在普通终端里跑，或给该命令放宽权限。

**`编码失败` / `Can't open video writer`**
确认 `ffmpeg -version` 可用或设 `FFMPEG`。ffmpeg 确实不可用时，`encode.py` 会退回 OpenCV 的
`mp4v` 输出（体积大、兼容性差，仅兜底）。

**输出 MP4 上下有黑边**
`encode.py` 靠「整行全黑」判定黑边。若首帧本身就是纯黑场景，极端情况下可能判错——换一帧当基准或手动裁剪。

**截图少了几帧**
无头 Chrome 并发下偶发失败。反复跑 `tools/refill.py` 直到 `missing: 0`，或降并发 `--workers 2`。

**想彻底去掉第三方素材**
删 `animation/boot-audio.mp3`、`animation/blades.json`、`assets/animation.html` 里内联的音轨、
`dist/dsh-sao-animation.mp4`、`docs/preview/02-blades.jpg`、`docs/preview/boot-preview.gif`
（GIF 里也含笔触抽帧），按 §6 生成自己的版本，再 `build.py`。
注意 `build.py` 需要 `blades.json` 存在 —— 先放一个 `[]` 进去即可（笔触段就是空的）。

---

## 8. 发布到 GitHub 前的检查清单

1. **署名**：版权署名统一用 `JingYumi`（需要邮箱时写 `845144969@qq.com`）；
   GitHub 地址用账号名 `YaJing0412` —— `LICENSE`、`README.md`、`package.json` 的
   `repository` / `homepage` / `bugs`，以及 README / INSTALL 里的示例 URL 与安装命令都已按此填好。
2. **第三方素材**：确认接受随附的音轨与笔触抽帧（见 `THIRD_PARTY_NOTICES.md`），或按 §6 替换。
3. **自检**：
   ```bash
   npm run check                 # node --check 三个 lib 文件 + 导入宿主半区
   npm pack --dry-run            # 确认包内容（lib/、assets/、locale/、icon.svg、cordis.patch.yml、package.json、README、LICENSE、CHANGELOG）
   python tools/build.py         # 确认 assets/animation.html 能源码构建
   ```
4. **体积**：最大单文件 2.2 MB，远低于 GitHub 100 MB 限制，**不需要 Git LFS**。
5. **别提交**：`node_modules/`、`__pycache__/`、`%TEMP%` 帧目录、`dist/*-silent.mp4`（`.gitignore` 已覆盖）。
6. **提交并推送**：
   ```bash
   git init -b main
   git add .
   git commit -m "feat: DSH boot animation plugin (13.6s startup splash)"
   git remote add origin https://github.com/YaJing0412/dsh-sao-animation.git
   git push -u origin main
   ```
7. **发布后**：About 里填描述；topics 建议 `dsh` `dsh-plugin` `deepseek-harness` `sao-animation`
   `cordis` `splash`；社交预览图用 `docs/preview/02-blades.jpg`；
   想顺带上 npm 就 `npm publish --access public`（`package.json` 已去掉 `private`）。