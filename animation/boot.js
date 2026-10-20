/* DSH boot sequence — timeline renderer.
   Every frame is a pure function of t (ms), so seeking is exact and the
   soundtrack can be scrubbed on the same timebase. */

(() => {
  'use strict';

  const DURATION = 13600;
  const T = {
    link:    [0, 2000],
    connect: [2000, 3490],
    flash:   [3480, 3630],
    burst:   [3620, 4900],
    blades:  [5450, 6450],
    bloom:   [6400, 6750],
    dial1:   [6850, 8000],
    dial2:   [8000, 8900],
    rail:    [8900, 9750],
    pill:    [9640, 10750],
    login:   [10750, 11700],
    lock:    [11700, 13600],
  };

  const $ = (id) => document.getElementById(id);
  const stage = $('stage');
  const fx = $('fx');
  const ctx = fx.getContext('2d');
  const snd = $('snd');

  const el = {
    scLink: $('scLink'), scConnect: $('scConnect'), scHud: $('scHud'),
    scUi: $('scUi'), scLock: $('scLock'),
    lsRing: $('lsRing'), lsCore: $('lsCore'), lsCount: $('lsCount'),
    lsBig: $('lsBig'), lsMono: $('lsMono'), lsProg: $('lsProg'),
    linkMark: $('linkMark'), linkZh: $('linkZh'), linkMono: $('linkMono'),
    paper: $('paper'), dialWrap: $('dialWrap'), dialA: $('dialA'), dialB: $('dialB'),
    chipA: $('chipA'), chipB: $('chipB'), railHost: $('railHost'),
    pillLang: $('pillLang'), pillVal: $('pillVal'), loginCard: $('loginCard'),
    accTyped: $('accTyped'), pwdTyped: $('pwdTyped'), accCaret: $('accCaret'), pwdCaret: $('pwdCaret'),
    lockBrand: $('lockBrand'), lockTag: $('lockTag'), lockBar: $('lockBar'),
    flash: $('flash'), bloom: $('bloom'), readout: $('readout'), sndHint: $('sndHint'),
  };

  const PALETTE = ['#d81fd8', '#8fd94a', '#22c4dd', '#e6d04a', '#e0396b', '#ffffff', '#111111', '#8a9099', '#a08cf7', '#4d6bfe'];
  /* the reference blast is paint, not a colour wheel: magenta / lime / cyan /
     red / green / black / grey, in roughly that order of frequency */
  const BLADE = ['#d81fd8', '#c8d63a', '#22c4dd', '#cc2222', '#111111', '#8a9099',
                 '#2fbf4f', '#8a2be2', '#d81fd8', '#1b1b1b', '#3ec9d6', '#d81fd8'];

  /* ── math ─────────────────────────────────────────────── */
  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const lerp = (a, b, p) => a + (b - a) * p;
  const seg = (t, a, b) => clamp01((t - a) / (b - a));
  const easeOut = (p) => 1 - Math.pow(1 - p, 3);
  const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const tent = (t, a, peak, b) => (t < peak ? seg(t, a, peak) : 1 - seg(t, peak, b));
  const backOut = (p) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };

  function rng(seed) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  /* ── canvas sizing ────────────────────────────────────── */
  let W = 1280, H = 720, dpr = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = stage.getBoundingClientRect();
    W = Math.max(320, Math.round(r.width));
    H = Math.max(180, Math.round(r.height));
    fx.width = Math.round(W * dpr);
    fx.height = Math.round(H * dpr);
    if (typeof applyStyles === 'function') applyStyles();
  }

  /* ── burst: the small wet star at 3.6s ────────────────── */
  const rand = rng(20771);
  const shards = Array.from({ length: 260 }, () => {
    const a = rand() * Math.PI * 2;
    return {
      a,
      sp: 0.25 + Math.pow(rand(), 1.6) * 0.95,
      len: 4 + rand() * 26,
      w: 0.7 + rand() * 2.4,
      c: PALETTE[(rand() * PALETTE.length) | 0],
      delay: rand() * 90,
    };
  });

  /* ── blades: the real shot, lifted from the reference clip ── */
  /* tools/build.py replaces the placeholder below with the whole of blades.json.
     While editing the loose sources the list is empty, so the frames are fetched
     from blades.json instead — that needs an http:// page (tools/serve.py);
     over file:// the segment simply stays empty. */
  const BLADE_FRAMES = (() => { return /*BLADE_FRAMES*/[]; })();
  const BLADE_START = 5450, BLADE_END = 6450;
  const bladeImgs = BLADE_FRAMES.map((src) => { const im = new Image(); im.src = src; return im; });
  if (!bladeImgs.length && location.protocol !== 'file:') {
    fetch('blades.json').then((r) => r.json()).then((list) => {
      list.forEach((src) => { const im = new Image(); im.src = src; bladeImgs.push(im); });
    }).catch(() => { /* keep the segment empty */ });
  }

  /* ── rail mini dials ──────────────────────────────────── */
  const minis = [];
  for (let i = 0; i < 5; i++) {
    const d = document.createElement('div');
    d.className = 'mini';
    d.style.top = (9 + i * 17.5) + '%';
    d.style.right = '4.6%';
    d.innerHTML = '<i></i><i></i><i></i>';
    const dash = document.createElement('div');
    dash.className = 'mini-dash';
    dash.style.top = (9 + i * 17.5 + 4.2) + '%';
    dash.style.right = '13.4%';
    el.railHost.appendChild(dash);
    el.railHost.appendChild(d);
    minis.push({ box: d, dash });
  }

  function setText(node, value) {
    if (node.dataset.v !== value) { node.textContent = value; node.dataset.v = value; }
  }

  /* ── canvas scenes ────────────────────────────────────── */
  function drawBurst(t) {
    const p = seg(t, 3620, 4900);
    const cx = W * 0.5, cy = H * 0.47;
    const unit = H / 720;

    ctx.save();
    const coreR = 2 + 16 * easeOut(seg(t, 3640, 3790)) * (1 - 0.5 * p);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(6, coreR * 2.4));
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.45, 'rgba(255,230,255,.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(6, coreR * 2.4), 0, Math.PI * 2); ctx.fill();

    ctx.lineCap = 'round';
    const burstFade = 1 - seg(t, 4650, 4880);
    for (const s of shards) {
      const local = clamp01((t - 3640 - s.delay) / 840);
      if (local <= 0) continue;
      const r = 10 * unit + s.sp * 520 * unit * Math.pow(local, 1.55);
      const len = s.len * unit * 1.35 * (1.08 - 0.5 * local);
      ctx.globalAlpha = Math.max(0, 1 - local * 0.72) * 0.95 * burstFade;
      ctx.strokeStyle = s.c;
      ctx.lineWidth = s.w * unit * 1.45 * (1 - 0.35 * local);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(s.a) * r, cy + Math.sin(s.a) * r);
      ctx.lineTo(cx + Math.cos(s.a) * (r + len), cy + Math.sin(s.a) * (r + len));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    const bp = easeOut(seg(t, 3700, 4450));
    if (bp > 0 && bp < 1.02) {
      const ang = lerp(-0.25, -0.62, bp);
      const rad = (6 + 20 * bp) * unit;
      ctx.save();
      ctx.filter = 'blur(' + (7 * unit) + 'px)';
      ctx.fillStyle = '#d81fd8';
      for (let k = 0; k < 5; k++) {
        const q = bp - k * 0.045;
        if (q <= 0) continue;
        const qx = lerp(cx, W * 0.605, q);
        const qy = lerp(cy, H * 0.285, q) - Math.sin(q * Math.PI) * H * 0.02;
        ctx.globalAlpha = (1 - k / 5) * 0.5 * burstFade;
        ctx.beginPath();
        ctx.ellipse(qx, qy, rad * (1 - k * 0.1) * 1.55, rad * (1 - k * 0.1), ang, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function drawBladeClip(t) {
    if (!bladeImgs.length || t < BLADE_START || t > BLADE_END) return;
    const step = (BLADE_END - BLADE_START) / bladeImgs.length;
    const i = Math.max(0, Math.min(bladeImgs.length - 1, Math.floor((t - BLADE_START) / step)));
    const im = bladeImgs[i];
    if (!im || !im.complete || !im.naturalWidth) return;
    const fade = Math.min(seg(t, BLADE_START, BLADE_START + 70), 1 - seg(t, BLADE_END - 70, BLADE_END));
    ctx.save();
    ctx.globalAlpha = fade < 0 ? 0 : fade;
    ctx.drawImage(im, 0, 0, W, H);
    ctx.restore();
  }

  /* ── DOM scenes ───────────────────────────────────────── */
  function render(t) {
    stage.style.background = t >= 3500 && t < 11700 ? '#f4f5f7' : '#0f1115';

    /* 00 LINK START */
    {
      const on = t < 2060;
      el.scLink.style.display = on ? 'block' : 'none';
      if (on) {
        el.scLink.style.opacity = String(1 - seg(t, 1900, 2060));
        el.lsRing.style.transform = 'translate(-50%,-50%) rotate(' + (t * 0.085) + 'deg)';
        el.lsRing.style.opacity = String(seg(t, 0, 420));
        el.lsCore.style.transform = 'translate(-50%,-50%) scale(' + (1 + 0.22 * Math.sin(t / 170)) + ')';
        el.lsCore.style.opacity = String(seg(t, 120, 500));

        const big = easeOut(seg(t, 260, 900));
        el.lsBig.style.opacity = String(big);
        el.lsBig.style.letterSpacing = lerp(1.15, 0.62, big) + 'em';
        el.lsBig.style.transform = 'translateY(' + ((1 - big) * 10) + 'px)';

        el.lsMono.style.opacity = String(seg(t, 620, 1100));

        const remain = Math.max(0, 3 - Math.floor(t / 560));
        setText(el.lsCount, '00:0' + remain);
        el.lsCount.style.opacity = String(seg(t, 80, 380) * (remain === 0 && t % 300 > 150 ? 0.35 : 1));

        el.lsProg.style.width = (easeOut(seg(t, 120, 1880)) * 100) + '%';
      }
    }

    /* 01 开始连接 */
    {
      const on = t >= 1960 && t <= 3560;
      el.scConnect.style.display = on ? 'block' : 'none';
      if (on) {
        el.scConnect.style.opacity = String(seg(t, 2000, 2100));
        el.linkMark.style.opacity = String(lerp(0.05, 0.15, seg(t, 2000, 2950)));
        el.linkMark.style.transform = 'translate(-50%,-50%) scale(' + lerp(1, 1.035, seg(t, 2000, 3400)) + ')';
        const zs = seg(t, 2160, 2900);
        el.linkZh.style.opacity = String(zs);
        el.linkZh.style.letterSpacing = lerp(0.9, 0.42, easeOut(zs)) + 'em';
        const cur = el.linkZh.querySelector('.cur');
        if (cur) cur.style.opacity = t % 620 < 320 ? 1 : 0;
        el.linkMono.style.opacity = String(seg(t, 2560, 3200));
      }
    }

    /* flash + bloom */
    el.flash.style.opacity = String(tent(t, 3460, 3560, 3700) + tent(t, 6380, 6450, 6720) * 0.55);
    el.bloom.style.opacity = String(seg(t, 6400, 6620) * 0.95 * (1 - seg(t, 6660, 6980)));

    /* 06/07 dials */
    {
      const hudOn = t >= 6800 && t <= 9800;
      el.scHud.style.display = hudOn ? 'block' : 'none';
      el.paper.style.opacity = hudOn ? 1 : 0;
      if (hudOn) {
        const e1 = easeOut(seg(t, 6850, 7280));
        const e2 = easeOut(seg(t, 6970, 7400));
        const pan = easeInOut(seg(t, 8000, 8560));
        const collapse = easeInOut(seg(t, 8950, 9470));

        el.dialWrap.style.opacity = String(1 - collapse);
        const wrapScale = lerp(1, 1.07, pan) * lerp(1, 0.34, collapse);
        el.dialWrap.style.transform =
          'translate(-50%,-50%) translateX(' + ((pan * -0.26 + collapse * 0.30) * W) + 'px) scale(' + wrapScale + ')';

        el.dialA.style.opacity = String(seg(t, 6850, 6990));
        el.dialA.style.transform =
          'translate(' + (-(1 - e1) * W * 0.5) + 'px, -50%) rotate(' + lerp(-6, 0, e1) + 'deg) scale(' + lerp(1.05, 1, e1) + ')';
        el.dialB.style.opacity = String(seg(t, 6970, 7110));
        el.dialB.style.transform =
          'translate(' + ((1 - e2) * W * 0.5) + 'px, -50%) rotate(' + lerp(6, 0, e2) + 'deg) scale(' + lerp(1.05, 1, e2) + ')';

        setText(el.chipA, t < 8000 ? TXT.chipA : TXT.chipC);
        setText(el.chipB, t < 8000 ? TXT.chipB : TXT.chipD);
        const ca = seg(t, 7210, 7470), cb = seg(t, 7370, 7630);
        el.chipA.style.opacity = String(ca);
        el.chipA.style.transform = 'translate(-50%,-50%) scale(' + lerp(0.86, 1, backOut(ca)) + ')';
        el.chipB.style.opacity = String(cb);
        el.chipB.style.transform = 'translate(-50%,-50%) scale(' + lerp(0.86, 1, backOut(cb)) + ')';

        minis.forEach((m, i) => {
          const peek = t >= 8100 && t < 8900 ? easeOut(seg(t, 8100 + i * 150, 8360 + i * 150)) : 0;
          const railIn = easeOut(seg(t, 9080 + i * 95, 9320 + i * 95));
          const v = Math.max(peek * 0.9, railIn);
          m.box.style.opacity = String(v);
          m.dash.style.opacity = String(railIn);
          m.box.style.transform = 'scale(' + lerp(0.55, 1, easeOut(v)) + ') rotate(' + ((t / 40 + i * 30) % 360) + 'deg)';
        });
      }
    }

    /* 08/09 pills + login */
    {
      const on = t >= 9640 && t <= 11760;
      el.scUi.style.display = on ? 'block' : 'none';
      if (on) {
        const pin = easeOut(seg(t, 9760, 10020));
        const reveal = easeOut(seg(t, 10100, 10460));
        const out = seg(t, 10520, 10650);
        el.pillLang.style.opacity = String(pin * (1 - out));
        el.pillLang.style.transform = 'translate(' + (-(1 - pin) * W * 0.06) + 'px,-50%)';
        el.pillVal.style.opacity = String(reveal * (1 - out));
        el.pillVal.style.transform = 'translate(' + (-(1 - reveal) * W * 0.16) + 'px,-50%)';
        el.pillVal.style.clipPath = 'inset(0 ' + ((1 - reveal) * 100) + '% 0 0 round 9px)';

        const li = easeOut(seg(t, 10810, 11130));
        const lo = seg(t, 11600, 11700);
        el.loginCard.style.opacity = String(li * (1 - lo));
        el.loginCard.style.transform =
          'translate(-50%,-50%) translateY(' + ((1 - li) * 14 - lo * 8) + 'px) scale(' + lerp(0.94, 1, li) + ')';

        /* masked typing, the way the reference clip fills its two bars */
        const accN = Math.min(8, Math.floor(seg(t, 11030, 11410) * 8 + 1e-6));
        const pwdN = Math.min(10, Math.floor(seg(t, 11450, 11580) * 10 + 1e-6));
        if (el.accTyped) el.accTyped.textContent = '*'.repeat(accN);
        if (el.pwdTyped) el.pwdTyped.textContent = '*'.repeat(pwdN);
        const blink = Math.floor(t / 260) % 2 === 0;
        const accActive = t >= 10930 && t <= 11430;
        const pwdActive = t > 11430 && t <= 11600;
        if (el.accCaret) {
          el.accCaret.style.left = (0.46 + accN * 0.75) + 'em';
          el.accCaret.style.opacity = accActive ? (blink ? '1' : '0') : '0';
        }
        if (el.pwdCaret) {
          el.pwdCaret.style.left = (0.46 + pwdN * 0.75) + 'em';
          el.pwdCaret.style.opacity = pwdActive ? (blink ? '1' : '0') : '0';
        }
      }
    }

    /* 10 lockup */
    {
      const on = t >= 11690;
      el.scLock.style.display = on ? 'block' : 'none';
      if (on) {
        el.scLock.style.opacity = String(easeInOut(seg(t, 11760, 12300)));

        const wipe = easeInOut(seg(t, 12150, 12950));
        el.lockBrand.style.clipPath = 'inset(-14% ' + lerp(50, 0, wipe) + '% -14% ' + lerp(50, 0, wipe) + '%)';
        el.lockBrand.style.opacity = String(seg(t, 12150, 12500));
        el.lockBrand.style.filter = 'blur(' + ((1 - wipe) * 6) + 'px)';
        el.lockBrand.style.transform = 'translate(-50%,-50%) scale(' + lerp(1.04, 1, wipe) + ')';

        const tag = easeOut(seg(t, 12950, 13350));
        el.lockTag.style.opacity = String(tag);
        el.lockTag.style.letterSpacing = lerp(0.95, 0.42, tag) + 'em';

        el.lockBar.style.width = (easeOut(seg(t, 12850, 13300)) * 100) + '%';
      }
    }

    const phase = Object.keys(T).find((k) => t >= T[k][0] && t <= T[k][1]) || 'hold';
    el.readout.textContent = 't ' + (t / 1000).toFixed(2) + 's  ·  ' + phase + '  ·  ' + W + 'x' + H;
  }

  function paint(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (t >= 3620 && t <= 4950) drawBurst(t);
    drawBladeClip(t);
  }

  function safePaint(t) {
    try { paint(t); }
    catch (e) { el.readout.textContent = 'ERR paint: ' + e.message; }
  }

  /* ── soundtrack sync ──────────────────────────────────── */
  const params = new URLSearchParams(location.search);
  const ONCE = params.has('once');

  /* ── customisable copy ────────────────────────────────── */
  const TXT = {
    linkBig: 'LINK START',
    linkMono: 'neural link \u00b7 deepseek harness',
    connect: '\u5f00\u59cb\u8fde\u63a5',
    connectMono: 'establishing link \u00b7 dsh://local \u00b7 handshake',
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

  const STYLES = {};

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

  (function applyTextConfig() {
    let over = null;
    try {
      const raw = params.get('cfg');
      if (raw) {
        /* a raw '+' in a query string comes back as a space; base64 never
           contains one, so restoring it is always safe */
        const cfg = JSON.parse(decodeURIComponent(atob(raw.replace(/ /g, '+'))));
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
        }
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
    applyStyles();
  })();
  const muted = params.has('mute') || params.get('audio') === '0';
  let audioArmed = false;

  function audioSeek(ms) {
    if (!snd || !audioArmed) return;
    const want = Math.min(ms / 1000, (snd.duration || 99) - 0.06);
    try { if (Math.abs(snd.currentTime - want) > 0.2) snd.currentTime = want; } catch (e) { /* not seekable yet */ }
  }

  function armAudio() {
    if (muted || !snd) return;
    snd.play().then(() => {
      audioArmed = true;
      el.sndHint.style.display = 'none';
      audioSeek(now());
    }).catch(() => {
      /* autoplay policy: run the clock muted, offer the badge */
      snd.muted = true;
      snd.play().then(() => {
        audioArmed = true;
        el.sndHint.style.display = 'block';
      }).catch(() => {});
    });
  }

  window.addEventListener('pointerdown', () => {
    if (muted || !snd) return;
    if (audioArmed && snd.muted) {
      snd.muted = false;
      el.sndHint.style.display = 'none';
      audioSeek(now());
    }
  });

  /* ── loop + controls ──────────────────────────────────── */
  let start = performance.now();
  let seekTo = null;
  let paused = false;
  let lastT = 0;

  function now() { return seekTo !== null ? seekTo : performance.now() - start; }

  let finished = false;
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
    }
    if (lastT > t && audioArmed && !snd.paused) { try { snd.currentTime = t / 1000; } catch (e) {} }
    lastT = t;
    render(t);
    safePaint(t);
    if (audioArmed && !snd.paused) audioSeek(t);
    requestAnimationFrame(frame);
  }

  if (params.has('t')) seekTo = Number(params.get('t')) || 0;
  if (params.has('pause')) paused = true;
  if (params.has('hud')) el.readout.style.display = 'block';

  resize();

  if (seekTo !== null && paused) {
    render(seekTo); safePaint(seekTo);
  } else {
    armAudio();
    requestAnimationFrame(frame);
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      seekTo = null; paused = false; start = performance.now();
      if (!snd.muted) { try { snd.currentTime = 0; snd.play(); } catch (err) {} }
    } else if (e.code === 'ArrowRight') {
      seekTo = Math.min(DURATION, now() + 500); render(seekTo); safePaint(seekTo); audioSeek(seekTo);
    } else if (e.code === 'ArrowLeft') {
      seekTo = Math.max(0, now() - 500); render(seekTo); safePaint(seekTo); audioSeek(seekTo);
    } else if (e.key >= '1' && e.key <= '9') {
      const keys = Object.keys(T);
      const k = keys[Math.min(keys.length - 1, Number(e.key) - 1)];
      seekTo = T[k][0]; render(seekTo); safePaint(seekTo); audioSeek(seekTo);
    }
  });

  stage.addEventListener('click', () => {
    seekTo = null; paused = false; start = performance.now();
    if (!snd.muted) { try { snd.currentTime = 0; snd.play(); } catch (err) {} }
  });

  window.addEventListener('resize', () => {
    resize();
    if (paused && seekTo !== null) { render(seekTo); safePaint(seekTo); }
  });
})();
