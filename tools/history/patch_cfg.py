import pathlib, re
d = pathlib.Path(r"C:\Users\Administrator\Documents\deepseek-harness\default-workspace\dsh-boot")

# ---------- boot.html: give every customisable string its own addressable node ----------
h = (d/"boot.html").read_text(encoding="utf-8")
h = h.replace('<div class="ls-big" id="lsBig">LINK START</div>', '<div class="ls-big" id="lsBig">LINK START</div>')
h = h.replace('<div class="ls-mono" id="lsMono">neural link &middot; deepseek harness</div>',
              '<div class="ls-mono" id="lsMono">neural link &middot; deepseek harness</div>')
h = h.replace('<div class="link-zh" id="linkZh">开始连接<span class="cur"></span></div>',
              '<div class="link-zh" id="linkZh"><span id="linkZhText">开始连接</span><span class="cur"></span></div>')
h = h.replace('<div class="link-mono" id="linkMono">establishing link · <b>dsh://local</b> · handshake</div>',
              '<div class="link-mono" id="linkMono"><span id="linkMonoText">establishing link · dsh://local · handshake</span></div>')
h = h.replace('<div class="pill language" id="pillLang" style="left:22%">Language</div>',
              '<div class="pill language" id="pillLang" style="left:22%"><span id="pillLangText">Language</span></div>')
h = h.replace('<div class="pill value" id="pillVal" style="left:39%"><span class="tri"></span>DeepSeek</div>',
              '<div class="pill value" id="pillVal" style="left:39%"><span class="tri"></span><span id="pillValText">DeepSeek</span></div>')
h = h.replace('<div class="lt">Log in_<span class="cur"></span>:</div>',
              '<div class="lt"><span id="loginTitle">Log in_</span><span class="cur"></span>:</div>')
h = h.replace('<div>:account<div class="bar b1"></div></div>', '<div><span id="fieldA">:account</span><div class="bar b1"></div></div>')
h = h.replace('<div>:api key<div class="bar b2"></div></div>', '<div><span id="fieldB">:api key</span><div class="bar b2"></div></div>')
(d/"boot.html").write_text(h, encoding="utf-8")

# ---------- boot.js: text table + ?cfg= overrides + ?audio=0 ----------
j = (d/"boot.js").read_text(encoding="utf-8")

j = j.replace("""  const params = new URLSearchParams(location.search);
  const ONCE = params.has('once');""",
"""  const params = new URLSearchParams(location.search);
  const ONCE = params.has('once');

  /* ── customisable copy ────────────────────────────────── */
  const TXT = {
    linkBig: 'LINK START',
    linkMono: 'neural link \\u00b7 deepseek harness',
    connect: '\\u5f00\\u59cb\\u8fde\\u63a5',
    connectMono: 'establishing link \\u00b7 dsh://local \\u00b7 handshake',
    chipA: 'OK',
    chipB: 'reasoning',
    chipC: 'context',
    chipD: 'tools',
    pillLeft: 'Language',
    pillRight: 'DeepSeek',
    loginTitle: 'Log in_',
    fieldA: ':account',
    fieldB: ':api key',
    tagline: 'Everything is a Plugin',
  };

  (function applyTextConfig() {
    let over = null;
    try {
      const raw = params.get('cfg');
      if (raw) {
        const cfg = JSON.parse(decodeURIComponent(atob(raw)));
        over = (cfg && cfg.texts) || null;
      }
    } catch (e) { over = null; }
    if (over) {
      for (const k of Object.keys(TXT)) {
        const v = over[k];
        if (typeof v === 'string' && v.length) TXT[k] = v;
      }
    }
    const put = (id, value) => {
      const n = document.getElementById(id);
      if (n && typeof value === 'string' && value.length) n.textContent = value;
    };
    put('lsBig', TXT.linkBig);
    put('lsMono', TXT.linkMono);
    put('linkZhText', TXT.connect);
    put('linkMonoText', TXT.connectMono);
    put('pillLangText', TXT.pillLeft);
    put('pillValText', TXT.pillRight);
    put('loginTitle', TXT.loginTitle);
    put('fieldA', TXT.fieldA);
    put('fieldB', TXT.fieldB);
    put('lockTag', TXT.tagline);
  })();""")

j = j.replace("""        setText(el.chipA, t < 6760 ? 'OK' : 'context');
        setText(el.chipB, t < 6760 ? 'reasoning' : 'tools');""",
"""        setText(el.chipA, t < 6760 ? TXT.chipA : TXT.chipC);
        setText(el.chipB, t < 6760 ? TXT.chipB : TXT.chipD);""")

j = j.replace("""  const muted = params.has('mute');""",
"""  const muted = params.has('mute') || params.get('audio') === '0';""")

(d/"boot.js").write_text(j, encoding="utf-8")
print("html/js patched | TXT:", j.count("TXT."), "| audio flag:", "params.get('audio')" in j)
