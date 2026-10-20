# 第三方声明 / Third-Party Notices

本仓库的**代码与文档**以 MIT 授权（[LICENSE](LICENSE)）。但仓库里随附了两类
**不属于该授权范围**的素材，发布、二次分发或商用前请先读完本文。

---

## 1. 第三方影片素材（随附，未获授权）⚠️

| 文件 | 内容 | 来源 |
| --- | --- | --- |
| `animation/boot-audio.mp3` | 13.6 秒音轨（`-ss 13.4 -t 13.6`） | 下方影片 |
| `animation/blades.json` | 30 帧笔触画面（WebP），对应动画 5.45–6.45s | 下方影片 18.85–19.85s 抽帧 |
| `assets/animation.html` | 插件运行时加载的动画本体，**音轨与笔触帧以 base64 内联**；同时也是可双击播放的单文件成品 | 同上 |
| `dist/dsh-sao-animation.mp4` | 1280×720 成片，含上述音轨与帧 | 同上 |
| `docs/preview/02-blades.jpg` | 预览图，画面即上述抽帧 | 同上 |
| `docs/preview/boot-preview.gif` | 整段 13.6s 的预览 GIF（640×360 / 15fps），画面含上述抽帧与官方字标 | 同上 |

来源影片：刀剑神域动漫

因此：

- 上述素材的**著作权属于其原作者**，本仓库未获得任何形式的授权或再分发许可；
- 它们**不在** MIT 授权范围内，只是为了让插件开箱即用而随附，仅供学习、研究与演示；
- **装了插件就等于装上了这些素材**：插件启动时播放的就是 `assets/animation.html`。
  如果你的使用场景对版权敏感，请务必换成你自己的素材（见
  [INSTALL.md §6](INSTALL.md#6-用你自己的素材重做避免第三方版权)，两条命令即可重建音轨与笔触帧）；
- 如果你是权利人，或你的作品被误用，请开一个 issue，我们会**立即移除**相关文件；
- 动画的时间轴与节奏（13.4–27.0s 的"Link Start → 开始连接 → 觉醒 → 登录"）参照同一支影片的分镜，
  画面由 CSS / Canvas 重新绘制，未使用原片画面（笔触段除外）。

完全不含第三方素材的做法：

```bash
rm animation/boot-audio.mp3 animation/blades.json dist/dsh-sao-animation.mp4 docs/preview/02-blades.jpg docs/preview/boot-preview.gif
echo '[]' > animation/blades.json          # 笔触段留空
python tools/mux_audio.py --clip <你的影片或音频>
python tools/build.py                      # 重新生成 assets/animation.html（不再含第三方素材）
```

---

## 2. 品牌与商标

- `animation/brand.svg` 取自 DeepSeek Harness 桌面端安装包内的官方字标
  （`resources/app.asar` → `renderer/assets/welcome-brand.svg`），**不是**开源素材。
  它是 DeepSeek / DeepSeek Harness 权利人的商标资产，本项目仅作演示用途引用，
  **不转让、不授权**该字标给你。要商用请替换成你自己的 SVG（`build.py` 会把
  `animation/brand.svg` 内联两次，分别用于中段与收尾字标）。
- "DeepSeek"、"DeepSeek Harness" 及相关标识归其各自权利人所有。
- 本项目是**社区作品，与 DeepSeek 官方没有隶属、赞助或背书关系**；它是第三方插件，
  不是官方组件。
- CSS 里出现的 `Segoe UI` / `Microsoft YaHei` / `ui-monospace` 等只是**字体族名**，
  调用的是你系统里已装的字体，仓库未内嵌任何字体文件。

---

## 3. 本仓库使用到的开源项目

插件**运行时没有任何第三方依赖**（`lib/` 是纯 ESM + 一个静态 HTML），仓库也**不包含**下列项目的
任何源码，只通过 `import` 或命令行调用，因此它们的许可证不会传染到本项目（仍可按 MIT 分发）。

| 项目 | 版本 | 在本项目里的用途 | 许可证 |
| --- | --- | --- | --- |
| [Python](https://www.python.org/) | 3.9+ | 运行 `tools/` 下的全部脚本 | PSF-2.0 |
| [OpenCV](https://opencv.org/)（`opencv-python`） | 4.x | 抽帧、居中裁剪与缩放、`inpaint` 去角标、WebP 编码、写 MP4 | Apache-2.0 |
| [NumPy](https://numpy.org/) | 1.24+ | OpenCV 的数组后端（去角标掩膜计算） | BSD-3-Clause |
| [FFmpeg](https://ffmpeg.org/) | 4.0+ | 按时间抽帧、混音、H.264/AAC 重编码与 `+faststart` | LGPL-2.1+ 或 GPL-2.0+（取决于你的构建） |
| [Google Chrome](https://www.google.com/chrome/) / Chromium / Edge | 任意近版 | `capture.py` 以 `--headless=new` 逐帧截图 | 专有软件；仅调用，不再分发 |
| [Git](https://git-scm.com/) | 任意 | 版本管理（与运行无关） | GPL-2.0 |

说明：

- **DSH 本身**（`@deepseek-ai/*`）是宿主，不是本仓库的依赖：插件只在运行时使用宿主提供的
  公开接口（webserver 路由、`webserver/index-inject`、客户端 `shell.overlay` / `settings.section` 槽位）。
- **FFmpeg**：若你使用带 `--enable-gpl` 的构建（多数 Windows 第三方 zip 都是），
  以命令行方式调用不受影响；但如果你把 ffmpeg 二进制**一起打包分发**，
  需要遵守其 LGPL/GPL 条款（附许可证文本、提供对应源码）。建议只分发脚本本身。
- **Chrome**：截图功能依赖它的无头模式，你也可以改用系统里的 Edge / Chromium。
- **OpenCV**：`opencv-python` 是第三方轮子，底层 OpenCV 为 Apache-2.0；
  随附 `opencv-python` 的 `LICENSE-3RD-PARTY.txt` 一并遵守即可。

---

## 4. 素材来源与致谢

- 分镜节奏与音画时间轴参照一支刀剑神域动漫截取。
- 官方字标来自 DeepSeek Harness 桌面端安装包，本项目因其视觉语言而生。
- 动画实现（时间轴纯函数渲染、HUD 部件、笔触插入、去角标抽帧管线）与插件实现
  （宿主路由、双端客户端、去重机制）为本仓库原创。

---

## 5. 有问题怎么联系

开 issue 即可。涉及版权移除请求请注明文件路径与权利人身份，我们会优先处理。
