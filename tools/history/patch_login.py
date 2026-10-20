import pathlib
d = pathlib.Path(r"C:\Users\Administrator\Documents\deepseek-harness\default-workspace\dsh-boot")

# ---------- markup: each bar gets a typed strip + caret ----------
h = (d/"boot.html").read_text(encoding="utf-8")
old = """      <div class="fields">
        <div><span id="fieldA">:account</span><div class="bar b1"></div></div>
        <div><span id="fieldB">:api key</span><div class="bar b2"></div></div>
      </div>"""
new = """      <div class="fields">
        <div class="field">
          <span id="fieldA">:account</span>
          <div class="bar b1"><span class="typed" id="accTyped"></span><i class="caret" id="accCaret"></i></div>
        </div>
        <div class="field">
          <span id="fieldB">:api key</span>
          <div class="bar b2"><span class="typed" id="pwdTyped"></span><i class="caret" id="pwdCaret"></i></div>
        </div>
      </div>"""
assert old in h
h = h.replace(old, new)
(d/"boot.html").write_text(h, encoding="utf-8")

# ---------- styles ----------
c = (d/"boot.css").read_text(encoding="utf-8")
old_css = """.login .fields { display: grid; gap: .5em; }
.login .fields div { font-family: ui-monospace, Consolas, monospace; font-size: clamp(9px, 1.35vw, 19px); color: #dff6fb; }
.login .bar { height: .62em; background: #fff; border-radius: 1px; margin-top: .26em; }
.login .bar.b1 { width: 9.4em; }
.login .bar.b2 { width: 6.2em; }"""
new_css = """.login .fields { display: grid; gap: .85em; }
.login .field { display: grid; gap: .2em; }
.login .field > span {
  font-family: ui-monospace, Consolas, monospace;
  font-size: clamp(9px, 1.35vw, 19px);
  color: #dff6fb;
  letter-spacing: .02em;
}
.login .bar {
  position: relative;
  height: 1.12em;
  background: #fff;
  border-radius: 2px;
  box-shadow: 0 1px 0 rgba(0,0,0,.08);
  overflow: hidden;
}
.login .bar.b1 { width: 9.4em; }
.login .bar.b2 { width: 7.4em; }
.login .bar .typed {
  position: absolute;
  left: .46em;
  top: 50%;
  transform: translateY(-50%);
  font-family: ui-monospace, Consolas, monospace;
  font-size: .74em;
  line-height: 1;
  letter-spacing: .2em;
  color: #10333d;
  white-space: nowrap;
}
.login .bar .caret {
  position: absolute;
  top: 50%;
  left: .46em;
  width: .34em;
  height: .72em;
  margin-top: -.36em;
  background: #10333d;
  opacity: 0;
}"""
assert old_css in c
c = c.replace(old_css, new_css)
(d/"boot.css").write_text(c, encoding="utf-8")

# ---------- behaviour: type the two masked fields ----------
j = (d/"boot.js").read_text(encoding="utf-8")
j = j.replace("""    pillLang: $('pillLang'), pillVal: $('pillVal'), loginCard: $('loginCard'),""",
"""    pillLang: $('pillLang'), pillVal: $('pillVal'), loginCard: $('loginCard'),
    accTyped: $('accTyped'), pwdTyped: $('pwdTyped'), accCaret: $('accCaret'), pwdCaret: $('pwdCaret'),""")

old_login = """        const li = easeOut(seg(t, 9920, 10240));
        const lo = seg(t, 11020, 11120);
        el.loginCard.style.opacity = String(li * (1 - lo));
        el.loginCard.style.transform =
          'translate(-50%,-50%) translateY(' + ((1 - li) * 14 - lo * 8) + 'px) scale(' + lerp(0.94, 1, li) + ')';"""
new_login = """        const li = easeOut(seg(t, 9920, 10120));
        const lo = seg(t, 11020, 11120);
        el.loginCard.style.opacity = String(li * (1 - lo));
        el.loginCard.style.transform =
          'translate(-50%,-50%) translateY(' + ((1 - li) * 14 - lo * 8) + 'px) scale(' + lerp(0.94, 1, li) + ')';

        /* masked typing, the way the reference clip fills its two bars */
        const accN = Math.min(8, Math.floor(seg(t, 10140, 10520) * 8 + 1e-6));
        const pwdN = Math.min(10, Math.floor(seg(t, 10560, 11000) * 10 + 1e-6));
        if (el.accTyped) el.accTyped.textContent = '*'.repeat(accN);
        if (el.pwdTyped) el.pwdTyped.textContent = '*'.repeat(pwdN);
        const blink = Math.floor(t / 260) % 2 === 0;
        const accActive = t >= 10040 && t <= 10540;
        const pwdActive = t > 10540 && t <= 11020;
        if (el.accCaret) {
          el.accCaret.style.left = (0.46 + accN * 0.75) + 'em';
          el.accCaret.style.opacity = accActive ? (blink ? '1' : '0') : '0';
        }
        if (el.pwdCaret) {
          el.pwdCaret.style.left = (0.46 + pwdN * 0.75) + 'em';
          el.pwdCaret.style.opacity = pwdActive ? (blink ? '1' : '0') : '0';
        }"""
assert old_login in j
j = j.replace(old_login, new_login)
(d/"boot.js").write_text(j, encoding="utf-8")
print("login typing wired")
