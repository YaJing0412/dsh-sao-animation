# 插件实现说明

给想改插件本身（`lib/`）的人看的。只想用/改动画的话看
[README](../README.md) 和 [INSTALL](../INSTALL.md) 就够了。

## 1. 两端结构

```
┌─ 宿主（Node，lib/index.js）───────────────┐        ┌─ 客户端（lib/client.js / client-dom.js）─┐
│ · 注册 /dsh-boot/animation.html          │        │ · 启动时铺一层遮罩 iframe                │
│ · 注册 /dsh-boot/client-dom.js           │◀──────▶│ · 读设置、写设置                         │
│ · 注册 /dsh-boot/config（GET/POST 配置） │        │ · 把设置塞进 iframe 的 ?cfg=             │
│ · 往 index.html 注入引导脚本             │        │ · 监听跳过键、监听 'dsh-boot-done'       │
└──────────────────────────────────────────┘        └──────────────────────────────────────────┘
                                    动画本体：assets/animation.html（无状态静态页）
```

| 路由 | 方法 | 作用 |
| --- | --- | --- |
| `/dsh-boot/animation.html` | GET | 返回 `assets/animation.html`（`Cache-Control: no-store`） |
| `/dsh-boot/client-dom.js` | GET | 返回 `lib/client-dom.js`，供桌面壳注入 |
| `/dsh-boot/config` | GET | 返回当前配置（JSON） |
| `/dsh-boot/config` | POST | 覆盖写入配置（body ≤ 64 KB），返回 `{ok, config}` 或 `{ok:false,error}` |

> `/dsh-boot/…` 这几个**是历史路由名**：插件从 `dsh-boot-animation` 改名为 `dsh-sao-animation` 时
> 特意把它们保持不变，免得老书签、老配置和桌面端的注入脚本失效。名字与插件当前包名不一致是**有意为之**，
> 别顺手改成 `/dsh-sao/…`。

配置落盘在 `$DSH_HOME/dsh-sao-animation.json`（默认 `~/.dsh/dsh-sao-animation.json`；
改名前的 `~/.dsh/dsh-boot-animation.json` 仍作为**兼容回退**被读取，首次保存时自动迁移到新文件名），
读取时走 `sanitize()` 白名单校验：布尔开关、`skipKey`（≤40 字符、`[A-Za-z0-9+ -]`）、
15 个文案键（去换行、截断 200 字符）、13 个样式键（字号 6–200、颜色必须是 `#rrggbb` 形态的
3–8 位十六进制）。**任何非法值都会被丢弃回落到默认值**，所以配置文件损坏不会让动画挂掉。

## 2. 文案怎么进到动画里

动画是个**无状态、可缓存、可单独打开**的静态页，只从 URL 读配置；`?cfg=` 的载荷是
**percent-encoded 的 base64(JSON)**：

```js
// lib/client.js / lib/client-dom.js
const blob = btoa(encodeURIComponent(JSON.stringify(cfg)));
iframe.src = ANIM_URL + '?once=1&cfg=' + encodeURIComponent(blob) + '&audio=0';
```

动画侧（`animation/boot.js`）反向解，并额外容忍被还原成空格的 `+`：

```js
const raw = params.get('cfg');       // ?cfg=<percent-encoded base64>
const cfg = JSON.parse(decodeURIComponent(atob(raw.replace(/ /g, '+'))));
```

> **`encodeURIComponent` 不能省。** base64 里会出现 `+`，而查询串里的 `+` 被读回来是**空格**，
> 于是 `atob` 拿到被破坏的载荷、`JSON.parse` 抛错、整个自定义文案静默消失（回落到默认文案）。
> `+` 只在载荷含 `~`(0x7E) / `>`(0x3E) 且落在特定字节位置时出现，所以这个 bug 很隐蔽 —— 别把它改回去。
> 动画侧那句 `replace(/ /g, '+')` 是第二道保险：万一载荷在别处被还原成空格，解码照样能成功。

`audio:false` 时追加 `&audio=0`，动画就不 arm 音轨。`once=1` 让动画播完淡出并
`postMessage('dsh-boot-done')` 通知宿主收起遮罩。

## 3. 为什么有两份客户端实现

| 壳 | 页面来源 | 有 `window.__DSH_BOOT__` 吗 | 用哪份 |
| --- | --- | --- | --- |
| `dsh web` | 宿主渲染 `index.html` | 有（客户端模块图） | `lib/client.js`（槽位 `shell.overlay` + `settings.section`） |
| 桌面端 Electron | `dsh-app://app/` 直读打包好的 dist | **没有** | `lib/client-dom.js`（纯 DOM） |

桌面壳里根本没有客户端模块图（那一页只有一支预构建 bundle，`index-inject` 是唯一注入通道），
插件模块**永远不会执行** —— 这就是"装好了但重启后没动画"的根因。

所以宿主默认注入一段引导脚本加载 `client-dom.js`（`lib/index.js` 的 `BOOTSTRAP`），它负责：

- **启动遮罩**：iframe + 跳过键 + 3s 载入失败自撤 + 21s 硬超时兜底
- **设置入口**：`MutationObserver` 盯着设置弹窗，克隆一条现有左侧导航行改成「SAO启动设置」插到末尾，
  点开后在弹窗内渲染配置页（`left:206px` 让导航留在旁边）

在 `dsh web` 上这份脚本检测到 `__DSH_BOOT__` 就自动退出，不与模块版重复。

### 两份实现如何共存（去重）

- **遮罩**：`window.__dshBootSplashShown` 抢占式单例 —— 谁先起谁播，另一份直接放弃。
  模块版被 `sessionStorage` 门槛挡住时 DOM 版会补上，不会出现"两边都以为对方会播"的空窗。
- **设置入口**：模块版注册 `settings.section`；DOM 版注入的克隆行带 `data-dsh-boot-row`，
  每次扫描若发现"别人的"同名行就把自己删掉（reconcile），最终只剩一条。

## 4. 调试开关

宿主会清洗查询串，所以开关走 **hash**：

- `#noboot` —— 本次不播
- `#boot` —— 强制重播
- `#dom` —— 强制使用 DOM 实现（便于在 web 上验证同一份代码）

去重用的会话键是 `sessionStorage['dsh-boot-played']`，即**每个窗口会话只播一次**。

## 5. 边界与兜底

- 遮罩挂掉不影响宿主：组件内部全 `try/catch`，槽位崩溃也不拖垮页面。
- iframe 3s 没 load 完 → 自动卸载，不留黑屏；21s 硬超时兜底。
- 配置读不出来 / 写不进去 → 用默认值继续，设置页提示失败，不阻塞启动。
- `config.legacyInject: false` 可关掉桌面端的引导脚本注入（默认开启）。

## 6. 「预览动画」为什么不用 `window.open`

Electron 桌面壳没有实现 `window.open` 的 window-open handler，调用会被直接吞掉 ——
"点了没反应"。所以两种壳的预览都改走**内存内遮罩**：

- 模块版：`playPreview()` 用纯 DOM 建遮罩 + iframe，不依赖 overlay 槽位是否挂载
- DOM 版：`showSplash(cfg, preview=true)` 复用启动遮罩

`Esc` 或点「跳过」收起；播完动画自己 `postMessage` 回来关闭。

## 7. 动画侧依赖的接口（改动前先看）

`animation/boot.js` 对宿主只承诺这几件事，改插件时别破坏：

| 接口 | 含义 |
| --- | --- |
| `?once=1` | 不循环；播完淡出并 `postMessage('dsh-boot-done', '*')` 给父页面 |
| `?cfg=<percent-encoded base64(JSON)>` | `texts` 覆盖文案、`styles` 覆盖字号/颜色 |
| `?audio=0` / `?mute=1` | 不 arm 音轨 |
| `?t=<ms>&pause=1` | 定格某帧（截图与排错用） |
| 参照 1280 宽基准 | `styles.size` 是 1280 宽舞台上的 px，播放时按窗口等比缩放 |
| `skipLabel` | **插件侧**的键，动画不消费：跳过按钮由 `lib/client*.js` 自己画在遮罩上 |