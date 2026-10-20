# tools/history — 开发过程的一次性脚本

这些脚本记录了这个动画是怎么一步步长出来的,**已经全部应用到当前 `animation/`,正常使用不需要跑它们**。
留着只为可追溯:想知道某段代码为什么长这样,可以看这里。

| 脚本 | 干了什么 | 现在在哪 |
| --- | --- | --- |
| `import_blades.py` | 把去水印后的 24 帧写进时间轴槽位 `f0132–f0155`,并导出 `blades.json` | 已被 [`../extract_blades.py`](../extract_blades.py) 取代(从抽帧到去角标一步到位) |
| `patch_cfg.py` | 给每段文案加上独立节点,新增 `?cfg=` 覆盖与 `?audio=0` | `animation/boot.html`、`animation/boot.js` 的 `TXT` / `applyTextConfig` |
| `patch_login.py` | 登录卡两行改成"逐字打字 + 光标" | `animation/boot.css` 的 `.login .bar` 系列、`animation/boot.js` 的打字逻辑 |
| `patch_login2.py` | 打字条与光标尺寸微调 | 同上 |
| `patch_once.py` | 新增 `?once=1`:只播一次、淡出、`postMessage('dsh-boot-done')` | `animation/boot.js` 的 `finish()` |
| `patch_style.py` | 新增 `cfg.styles`(每段文案的字号/颜色)与 `applyStyles()` | `animation/boot.js` |

这些脚本当初写死了开发机的绝对路径,也不再保证能运行 —— 请只当**变更记录**看,
要重做同类修改,直接改 `animation/` 下的文件即可。