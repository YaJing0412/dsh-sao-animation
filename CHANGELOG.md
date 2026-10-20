# Changelog

## 1.3.0 (2026-10-20)

- 更名为 **dsh-sao-animation**（原 `dsh-boot-animation`）：包名、插件目录、安装命令、配置文件名与
  产物文件名全部同步；配置改为 `$DSH_HOME/dsh-sao-animation.json`，改名前的
  `~/.dsh/dsh-boot-animation.json` 仍作为**兼容回退**读取，首次保存时自动迁移到新文件名。
- 出片文件名改为 `dist/dsh-sao-animation.mp4`，静音中间产物同步改为 `dist/dsh-sao-animation-silent.mp4`。
- 设置分区更名为 **「SAO启动设置」**（原「启动动画」），Web 模块版与桌面端 DOM 注入用的是同一个标题。
- 按音轨重新对齐时间轴：总长仍为 13.6s / 30fps / 408 帧，满屏笔触段从 4.4–5.2s 后移到
  **5.45–6.45s** —— 原位置比音乐早约 1.05s，正是"音画不同步"的来源；其后的 HUD、
  `Language`/`DeepSeek` 胶囊、登录卡与收尾字标各段同步后移（登录卡打字随之落在 11.03–11.58s）。
- 笔触帧从 24 帧增加到 **30 帧**（同一参考片重新抽取，对应新的 1.0s 窗口），单文件体积随之增大。
- 补齐插件元数据：`locale/zh.json` 与 `locale/en.json`（已装插件页显示的标题与描述，locale 优先、
  `package.json` 的 `description` 兜底）以及 `icon.svg`（`package.json` 的 `icon` 字段）；
  `exports` 同时暴露 `./icon` 与 `./locale/*.json`。
- 自定义文案的 `?cfg=` 载荷改为 **percent-encoded**（客户端 `encodeURIComponent`）：查询串里的 `+`
  会被读回来当成空格、悄悄毁掉整份文案；动画侧同时容忍这种破坏（解码前把空格还原成 `+`）。
  见 `docs/PLUGIN.md` §2。
- 新增预览素材：`docs/preview/` 四张 1280×720 静帧（2.6s / 5.9s / 7.5s / 12.6s）与
  `docs/preview/boot-preview.gif`（640×360 / 15fps，整段 13.6s 循环），README 直接嵌入 GIF。
- 内部路由 `/dsh-boot/animation.html` 与 `/dsh-boot/config` **保持不变**：它们是历史路由名，
  改掉会让老书签和桌面端的注入脚本失效。

## 1.2.0

- 仓库整理成**仓库根即插件包**的结构：`package.json` / `cordis.patch.yml` / `lib/` / `assets/`，
  现在可以直接 `dsh plugin --profile web add github:YaJing0412/dsh-sao-animation` 安装。
- 动画源码改名 `src/` → `animation/`，构建产物改到 `assets/animation.html`
  （插件运行时读的就是这一个文件，同时它仍是可双击播放的单文件成品）。
- 修复设置里的自定义文案可能被 URL 解析悄悄破坏：base64 载荷里的 `+` 在查询串中会被读成空格，
  导致动画解码失败、回落到默认文案。`lib/client.js` 与 `lib/client-dom.js` 现在都对载荷做
  percent-encode（`docs/PLUGIN.md` §2 有详细说明）。
- 构建/出片工具链去掉了写死的本机绝对路径，Chrome / ffmpeg 自动探测，可跨机器使用。
- 新增 `tools/extract_blades.py`（从任意影片抽笔触帧 + 去角标）与 `tools/serve.py`（本地预览）。
- 动画源码版在 `http://` 下会回退读取 `animation/blades.json`，不再依赖构建才能看到笔触段。
- 补齐文档：README / INSTALL / docs/PLUGIN.md / docs/STORYBOARD.md / THIRD_PARTY_NOTICES.md。

## 1.1.0

- 设置页（设置 → 启动动画）：启用开关、音频、跳过快捷键、15 项文案与逐项字号/颜色、逐项回退、预览动画。
- 桌面端补齐纯 DOM 实现（`lib/client-dom.js`）：启动遮罩 + 设置入口注入，
  解决桌面壳没有客户端模块图、模块版永不执行的问题。
- 模块版与 DOM 版去重（抢占式单例 + 设置行 reconcile）。

## 1.0.0

- 首个可用的启动动画插件：13.6s 动画作为启动遮罩，播完自动淡出，会话内只播一次。
- 宿主半区提供 `/dsh-boot/animation.html`、`/dsh-boot/config`（配置文件 `$DSH_HOME/dsh-boot-animation.json`）。

## 0.x

- 动画本体：单文件 HTML（CSS + Canvas 实时渲染，24 帧实拍笔触插入，13.6s 音轨内联）与 1280×720 MP4。