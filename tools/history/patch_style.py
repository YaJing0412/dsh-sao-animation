import pathlib
d = pathlib.Path(r"C:\Users\Administrator\Documents\deepseek-harness\default-workspace\dsh-boot")
j = (d/"boot.js").read_text(encoding="utf-8")

# ---- per-string size/colour, driven by cfg.styles ----
j = j.replace("""  (function applyTextConfig() {""",
"""  const STYLES = {};

  const STYLE_TARGETS = {
    linkBig: () => document.getElementById('lsBig'),
    linkMono: () => document.getElementById('lsMono'),
    connect: () => document.getElementById('linkZhText'),
    connectMono: () => document.getElementById('linkMonoText'),
    chipA: () => el.chipA,
    chipB: () => el.chipB,
    pillLeft: () => document.getElementById('pillLangText'),
    pillRight: () => document.getElementById('pillValText'),
    loginTitle: () => document.getElementById('loginTitle'),
    fieldA: () => document.getElementById('fieldA'),
    fieldB: () => document.getElementById('fieldB'),
    tagline: () => document.getElementById('lockTag'),
  };

  /* User sizes are px on a 1280-wide stage; scale keeps the layout responsive. */
  function applyStyles() {
    const scale = W / 1280;
    for (const key of Object.keys(STYLES)) {
      const target = STYLE_TARGETS[key];
      const node = target ? target() : null;
      if (!node) continue;
      const spec = STYLES[key] || {};
      if (typeof spec.size === 'number' && spec.size > 0) {
        node.style.fontSize = (spec.size * scale).toFixed(2) + 'px';
      }
      if (typeof spec.color === 'string' && spec.color) {
        node.style.color = spec.color;
      }
    }
  }

  (function applyTextConfig() {""")

j = j.replace("""        const cfg = JSON.parse(decodeURIComponent(atob(raw)));
        over = (cfg && cfg.texts) || null;""",
"""        const cfg = JSON.parse(decodeURIComponent(atob(raw)));
        over = (cfg && cfg.texts) || null;
        const styles = (cfg && cfg.styles) || null;
        if (styles && typeof styles === 'object') {
          for (const k of Object.keys(styles)) {
            const v = styles[k];
            if (!v || typeof v !== 'object') continue;
            const spec = {};
            if (typeof v.size === 'number' && v.size > 0 && v.size <= 200) spec.size = v.size;
            if (typeof v.color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(v.color)) spec.color = v.color;
            if (Object.keys(spec).length) STYLES[k] = spec;
          }
        }""")

j = j.replace("""    put('lockTag', TXT.tagline);
  })();""",
"""    put('lockTag', TXT.tagline);
    applyStyles();
  })();""")

# keep sizes correct after a resize
j = j.replace("""    fx.width = Math.round(W * dpr);
    fx.height = Math.round(H * dpr);
  }""",
"""    fx.width = Math.round(W * dpr);
    fx.height = Math.round(H * dpr);
    if (typeof applyStyles === 'function') applyStyles();
  }""")
(d/"boot.js").write_text(j, encoding="utf-8")
print("boot.js: styles support =", "STYLE_TARGETS" in j, "| applyStyles calls =", j.count("applyStyles()"))
