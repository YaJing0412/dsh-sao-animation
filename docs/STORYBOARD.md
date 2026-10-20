# 分镜与实现说明

总长 **13.6s / 30fps / 408 帧 / 1280×720**。画面全部由 CSS + Canvas 实时绘制,
5.45–6.45s 的笔触段是插入的 30 帧实拍画面。

---

## 1. 分镜表

| # | 时间 | 画面 | `boot.js` 段名 |
| --- | --- | --- | --- |
| 00 | 0.0–2.0s | 暗场环形 HUD,倒计时 `00:03 → 00:00`,字距收拢的 `LINK START`,底部进度线走满 | `link` |
| 01 | 2.0–3.5s | 字标微光浮现 + **「开 始 连 接」** 带闪动光标,`establishing link · dsh://local` | `connect` |
| 02 | 3.48s | 闪白 | `flash` |
| 03 | 3.6–4.9s | 中心彩色碎片爆裂,品红水滴飞向右上 | `burst`(Canvas) |
| 04 | 5.45–6.45s | **满屏彩色笔触** —— 直接插入实拍画面的 30 帧 | `blades`(Canvas) |
| 05 | 6.4–6.75s | 白闪过曝收束 | `bloom` |
| 06 | 6.85–8.0s | 双圆环 HUD 滑入(刻度环 / 紫色弧段 / 白车道 / 定位点),chip `OK`·`reasoning` | `dial1` |
| 07 | 8.0–8.9s | 相机平移,chip 切 `context`·`tools`,右侧冒出小环 | `dial2` |
| 08 | 8.9–9.75s | 圆环缩放退场 → 右缘五枚小环带横杠落位 | `rail` |
| 09 | 9.64–10.75s | 蓝色胶囊 `Language` → 滑出 `▶ DeepSeek` | `pill` |
| 10 | 10.75–11.7s | 青色卡片 `Log in_::` + `:account` / `:api key`,逐字打字 | `login` |
| 11 | 11.7–13.6s | 暗场收束,官方字标中央擦除展开 → `EVERYTHING IS A PLUGIN` → 进度条走满 | `lock` |

## 2. 时间轴常量

`animation/boot.js` 顶部:

```js
const DURATION = 13600;                 // 总长(ms)
const T = {
  link: [0, 2000],      connect: [2000, 3490], flash: [3480, 3630],
  burst: [3620, 4900],  blades: [5450, 6450],  bloom: [6400, 6750],
  dial1: [6850, 8000],  dial2: [8000, 8900],   rail: [8900, 9750],
  pill: [9640, 10750],  login: [10750, 11700], lock: [11700, 13600],
};
```

- `DURATION` 决定循环点;`?once=1` 时播完即淡出。
- 数字键 `1`–`9` 按 `Object.keys(T)` 顺序跳段,只覆盖前 9 段。
- 改了时间轴要同步改 `tools/capture.py --dur`,否则出片会缺帧或多帧。

## 3. 渲染模型

**每一帧都是 `t` 的纯函数**:`render(t)` 只做 DOM 样式赋值,`paint(t)` 只重画 Canvas,
没有任何跨帧状态。好处是:

- 定格取帧天然精确:`?t=5900&pause=1` 就是那一帧,逐帧截图才能拼成视频;
- 音轨可以随时校准(见 §4);
- 拖时间轴、单帧调试、改样式都不会积累误差。

随机性用固定种子的 LCG(`rng(20771)`)生成 260 片爆裂碎片,保证每次渲染完全一致。

舞台是 **16:9 letterbox**:`#stage` 取 `min(100vw, 100vh*16/9)`,
所有尺寸以 1280 为基准、按 `W/1280` 等比缩放(`applyStyles()`),
因此从手机到 4K 都不变形。

## 4. 音轨同步

- `audioSeek(ms)` 每帧把 `audio.currentTime` 校到 `t/1000`,**误差 > 0.2s 才回拉**,
  避免频繁 seek 造成爆音;循环时 `currentTime` 归零。
- 浏览器自动播放策略会拦声音:先静音播放并显示 `🔊 点击任意处开启声音`,
  首次 `pointerdown` 时解除静音并校准进度。
- HTML 里音轨以 base64 内联,MP4 里是 AAC 160 kbps。
- **2026-10-20 按音轨重新对齐**:满屏笔触段从 4.4–5.2s 后移到 **5.45–6.45s**
  （原位置比音乐早约 1.05s,正是"音画不同步"的来源）,后面的段同步后移,总长仍是 13.6s。

## 5. 出片管线

```
animation/ ──build.py──▶ assets/animation.html   ← 插件运行时读的就是这个文件
                          │
                          ├─capture.py─▶ %TEMP%\dsh-boot-frames\f0000.png …f0407.png
                          │                  (无头 Chrome,每帧一个 ?t=&pause=1)
                          ├─refill.py ─▶ 补拍失败帧
                          │
                          └─encode.py ─▶ dist/…-silent.mp4   (cv2 序列 → ffmpeg H.264)
                                            │
                                  mux_audio.py ─▶ dist/dsh-sao-animation.mp4
```

`extract_blades.py` 是旁路:从源片抽帧、居中裁 16:9、去角标、写 `animation/blades.json`;
带 `--slot 164` 时还会把 PNG 覆盖进帧目录的 `f0164.png…`,让 MP4 与 HTML 用同一组笔触帧。

## 6. 一些实现细节

| 现象 | 做法 |
| --- | --- |
| 双闪白 | `tent(t,3460,3560,3700) + tent(t,6380,6450,6720)*0.55` |
| 纸白 / 暗场切换 | `t ∈ [3500,11700)` 用 `#f4f5f7`,其余 `#0f1115` |
| 字距动画 | `letterSpacing` 由 `1.15em` 收到 `0.62em`,配合 `easeOut` |
| 胶囊展开 | `clip-path: inset(0 X% 0 0 round 9px)`,X 由 100 收到 0 |
| 登录打字 | 卡片 10.81–11.13s 入场、11.60–11.70s 退场;`:account` 8 颗星 11.03–11.41s,`:api key` 10 颗星 11.45–11.58s;每帧算字数,`'*'.repeat(n)`,光标按 `t/260` 闪烁并跟着字数右移 |
| 收尾字标 | 两侧 `clip-path inset(-14% 50% …)` 对收 + `blur(6px→0)`,再加字距收拢 |
| 高分屏 | `dpr = min(devicePixelRatio, 2)`,Canvas 按 dpr 放大 |
| 笔触段淡入淡出 | 两端各 70ms,把 30 帧均匀铺在 5.45–6.45s |

## 7. 已知取舍

- **单文件体积**:笔触帧用 WebP q82 内联(约 1.9 MB),换来"双击即放、零外部依赖"。
  想瘦身可换更少帧数或更低质量:`extract_blades.py --frames 16 --quality 70`。
- **源码版笔触依赖 http**:`file://` 下浏览器禁止读取同目录 `blades.json`,
  所以源码版请用 `tools/serve.py` 打开;成品单文件不受影响。
- **MP4 里的笔触帧**用的是无损 PNG(经 `cv2` 编码后交给 ffmpeg),与 HTML 版的
  WebP 帧略有差异,1× 播放看不出来。