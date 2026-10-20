import pathlib
p = pathlib.Path(r"C:\Users\Administrator\Documents\deepseek-harness\default-workspace\dsh-boot\boot.js")
s = p.read_text(encoding="utf-8")

# one-shot mode for the startup overlay: no loop, fade out, tell the host
s = s.replace("""  const params = new URLSearchParams(location.search);""",
"""  const params = new URLSearchParams(location.search);
  const ONCE = params.has('once');""")

s = s.replace("""  function frame() {
    let t = now();
    if (t > DURATION) {
      t = t % DURATION;
      lastT = -1;                       /* forces a soundtrack restart */
    }""",
"""  let finished = false;
  function finish() {
    if (finished) return;
    finished = true;
    render(DURATION); safePaint(DURATION);
    document.getElementById('sndHint').style.display = 'none';
    setTimeout(() => {
      stage.style.transition = 'opacity .45s ease';
      stage.style.opacity = '0';
      setTimeout(() => { try { parent.postMessage('dsh-boot-done', '*'); } catch (e) {} }, 520);
    }, 320);
  }

  function frame() {
    let t = now();
    if (t > DURATION) {
      if (ONCE) { finish(); return; }
      t = t % DURATION;
      lastT = -1;                       /* forces a soundtrack restart */
    }""")
p.write_text(s, encoding="utf-8")
print("once mode added:", "ONCE" in s)
