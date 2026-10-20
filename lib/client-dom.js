/**
 * dsh-sao-animation — DOM half (the desktop shell).
 *
 * The desktop shell serves the page from `dsh-app://app/` and never injects the
 * `__DSH_BOOT__` client graph, so a browser plugin module cannot reach `slots`
 * there. Everything here is therefore plain DOM:
 *
 *   · the splash overlay (iframe + skip key)
 *   · a "启动动画" row injected into the Settings dialog, opening this plugin's
 *     own configuration page inside that dialog
 *
 * On `dsh web` the module half (./client.js) owns both, and this file bails out.
 */
(function () {
  'use strict';

  /* The web shell injects the client graph as window.__DSH_BOOT__; the desktop
     shell never does (its page is one prebuilt bundle served from dsh-app://app/).
     The graph, not __ModuleLoader__, is what tells the two apart. */
  var force = String(location.hash || '').indexOf('dom') >= 0;
  var boot = window.__DSH_BOOT__;
  var hasGraph = !!(boot && (Array.isArray(boot) ? boot.length : Object.keys(boot).length));
  /* Both halves may load. They coordinate instead of excluding each other:
     the splash is claimed through window.__dshBootSplashShown, and a settings
     row injected by the DOM half is removed as soon as the module half
     registers its own section. hasGraph only decides who injects first. */
  if (window.__dshBootDom) return;
  window.__dshBootDom = true;

  var CONFIG_URL = '/dsh-boot/config';
  var ANIM_URL = '/dsh-boot/animation.html';
  var SESSION_KEY = 'dsh-boot-played';
  var NAV_MATCH = ['\u8d26\u53f7\u4e0e\u4f59\u989d', '\u901a\u7528\u8bbe\u7f6e', '\u6a21\u578b',
    '\u5185\u7f6e\u63d2\u4ef6', 'Agent \u9884\u8bbe'];
  var SECTION_LABEL = 'SAO启动设置';

  var TEXT_FIELDS = [
    ['linkBig', 'LINK START \u5927\u5b57'],
    ['linkMono', 'LINK START \u526f\u6807\u9898'],
    ['connect', '\u300c\u5f00\u59cb\u8fde\u63a5\u300d'],
    ['connectMono', '\u5f00\u59cb\u8fde\u63a5 \u526f\u6807\u9898'],
    ['chipA', '\u8868\u76d8\u6807\u7b7e A'],
    ['chipB', '\u8868\u76d8\u6807\u7b7e B'],
    ['chipC', '\u8868\u76d8\u6807\u7b7e C'],
    ['chipD', '\u8868\u76d8\u6807\u7b7e D'],
    ['pillLeft', '\u80f6\u56ca\u5de6'],
    ['pillRight', '\u80f6\u56ca\u53f3'],
    ['loginTitle', '\u767b\u5f55\u5361\u6807\u9898'],
    ['fieldA', '\u5b57\u6bb5\u4e00'],
    ['fieldB', '\u5b57\u6bb5\u4e8c'],
    ['tagline', '\u6536\u5c3e\u6807\u8bed'],
    ['skipLabel', '\u8df3\u8fc7\u6309\u94ae\u6587\u5b57'],
  ];

  var DEFAULTS = {
    enabled: true,
    audio: true,
    skipKey: 'Escape',
    texts: {
      linkBig: 'LINK START',
      linkMono: 'neural link \u00b7 deepseek harness',
      connect: '\u5f00\u59cb\u8fde\u63a5',
      connectMono: 'establishing link \u00b7 dsh://local \u00b7 handshake',
      chipA: 'OK', chipB: 'reasoning', chipC: 'context', chipD: 'tools',
      pillLeft: 'Language', pillRight: 'DeepSeek',
      loginTitle: 'Log in_', fieldA: ':account', fieldB: ':api key',
      tagline: 'Everything is a Plugin',
      skipLabel: '\u70b9\u51fb\u8df3\u8fc7 / SKIP',
    },
    styles: {
  linkBig: { size: 32, color: '#eef2f8' },
  linkMono: { size: 12, color: '#9aa4b2' },
  connect: { size: 27, color: '#f2f3f5' },
  connectMono: { size: 12, color: '#8d949f' },
  chipA: { size: 19, color: '#134c56' },
  chipB: { size: 19, color: '#134c56' },
  pillLeft: { size: 25, color: '#ffffff' },
  pillRight: { size: 25, color: '#0b3b44' },
  loginTitle: { size: 32, color: '#ffffff' },
  fieldA: { size: 17, color: '#dff6fb' },
  fieldB: { size: 17, color: '#dff6fb' },
  tagline: { size: 13, color: '#9aa1ad' },
  skipLabel: { size: 12, color: '#cfd6e2' },
},

  };


  var cfg = null;

  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  function loadConfig() {
    if (cfg) return Promise.resolve(cfg);
    return fetch(CONFIG_URL, { credentials: 'same-origin', cache: 'no-store' })
      .then(function (res) { return res && res.ok ? res.json() : null; })
      .then(function (json) {
        cfg = json && typeof json === 'object' ? json : clone(DEFAULTS);
        return cfg;
      })
      .catch(function () { cfg = clone(DEFAULTS); return cfg; });
  }

  function saveConfig(next) {
    return fetch(CONFIG_URL, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    })
      .then(function (res) { return res && res.ok ? res.json() : null; })
      .then(function (json) {
        if (json && json.ok && json.config) { cfg = json.config; return json.config; }
        return null;
      })
      .catch(function () { return null; });
  }

  function animUrl(conf) {
    var parts = ['once=1'];
    /* percent-encode the base64: a raw '+' in a query string is read back as a
       space, which corrupts the payload and makes the custom copy silently vanish */
    try { parts.push('cfg=' + encodeURIComponent(btoa(encodeURIComponent(JSON.stringify(conf))))); } catch (e) {}
    if (conf && conf.audio === false) parts.push('audio=0');
    return ANIM_URL + '?' + parts.join('&');
  }

  function keySpec(event) {
    var parts = [];
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
    if (event.metaKey) parts.push('Meta');
    var key = event.key;
    if (key === ' ' || key === 'Spacebar') key = 'Space';
    else if (key === 'Esc') key = 'Escape';
    else if (key.length === 1) key = key.toUpperCase();
    parts.push(key);
    return parts.join('+');
  }

  function matchKey(event, spec) {
    if (!spec) return false;
    var parts = String(spec).split('+').map(function (s) { return s.trim(); }).filter(Boolean);
    if (!parts.length) return false;
    var key = parts[parts.length - 1].toLowerCase();
    var mods = parts.slice(0, -1).map(function (s) { return s.toLowerCase(); });
    var actual = event.key;
    if (actual === ' ' || actual === 'Spacebar') actual = 'Space';
    if (actual === 'Esc') actual = 'Escape';
    var hit = actual.toLowerCase() === key || String(event.code || '').toLowerCase() === key;
    return hit
      && !!event.ctrlKey === (mods.indexOf('ctrl') >= 0)
      && !!event.altKey === (mods.indexOf('alt') >= 0)
      && !!event.shiftKey === (mods.indexOf('shift') >= 0)
      && !!event.metaKey === (mods.indexOf('meta') >= 0);
  }

  /* ---------------- splash ---------------- */

  function showSplash(conf, preview) {
    if (!preview && window.__dshBootSplashShown) return function () {};
    if (!preview) { try { window.__dshBootSplashShown = true; } catch (e) {} }
    var wrap = document.createElement('div');
    wrap.id = 'dsh-boot-splash';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:2147483600;background:#0f1115;'
      + 'opacity:1;transition:opacity .4s ease;pointer-events:auto;';

    var frame = document.createElement('iframe');
    frame.id = 'dsh-boot-frame';
    frame.src = animUrl(conf);
    frame.setAttribute('allow', 'autoplay');
    frame.style.cssText = 'width:100%;height:100%;border:0;display:block;background:#0f1115;';

    var skipStyle = (conf.styles && conf.styles.skipLabel) || {};
    var skip = document.createElement('div');
    skip.textContent = (conf.texts && conf.texts.skipLabel) || DEFAULTS.texts.skipLabel;
    skip.style.cssText = 'position:absolute;right:18px;bottom:16px;padding:7px 14px;'
      + 'border:1px solid rgba(255,255,255,.22);border-radius:999px;color:'
      + (skipStyle.color || '#cfd6e2') + ';font:'
      + (skipStyle.size ? (skipStyle.size * (window.innerWidth / 1280)) : 12)
      + 'px/1.2 system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:.08em;'
      + 'cursor:pointer;background:rgba(8,10,14,.55);user-select:none;z-index:1;';

    var closed = false;
    function close() {
      if (closed) return;
      closed = true;
      window.removeEventListener('message', onMessage);
      window.removeEventListener('keydown', onKey, true);
      wrap.style.opacity = '0';
      setTimeout(function () { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }, 460);
    }
    function onMessage(event) { if (event && event.data === 'dsh-boot-done') close(); }
    function onKey(event) {
      if (matchKey(event, conf.skipKey || 'Escape') || (preview && event.key === 'Escape')) {
        event.preventDefault();
        close();
      }
    }

    skip.addEventListener('click', close);
    window.addEventListener('message', onMessage);
    window.addEventListener('keydown', onKey, true);

    var loadTimer = setTimeout(function () {
      if (!frame.dataset.loaded) close();
    }, 3000);
    frame.addEventListener('load', function () {
      frame.dataset.loaded = '1';
      clearTimeout(loadTimer);
    });

    wrap.appendChild(frame);
    wrap.appendChild(skip);
    (document.body || document.documentElement).appendChild(wrap);
    setTimeout(close, 21000);
    return close;
  }

  function runSplash() {
    var params = null;
    try { params = new URLSearchParams(location.search); } catch (e) { params = null; }
    var hash = String(location.hash || '');
    if ((params && params.has('noboot')) || hash.indexOf('noboot') >= 0) return;
    var forced = (params && params.has('boot')) || hash.indexOf('boot') >= 0;
    if (!forced) {
      try {
        if (sessionStorage.getItem(SESSION_KEY) === '1') return;
        sessionStorage.setItem(SESSION_KEY, '1');
      } catch (e) { /* ignore */ }
    }

    loadConfig().then(function (conf) {
      if (conf.enabled === false) return;
      showSplash(conf, false);
    });
  }

  /* ---------------- settings surface ---------------- */

  function box(style, children) {
    var node = document.createElement('div');
    if (style) node.style.cssText = style;
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  var S = {
    page: 'position:absolute;top:0;right:0;bottom:0;left:206px;z-index:60;overflow:auto;'
      + 'padding:22px 26px 60px;'
      + 'color:var(--dsw-alias-label-primary);font-size:13px;line-height:1.55;',
    title: 'margin:0 0 4px;font-size:17px;font-weight:600;',
    hint: 'margin:0 0 16px;color:var(--dsw-alias-label-secondary);font-size:12.5px;',
    card: 'border:1px solid var(--dsw-alias-border-l2);border-radius:12px;padding:0 16px;margin-bottom:14px;',
    row: 'display:flex;align-items:center;justify-content:space-between;gap:16px;padding:11px 0;'
      + 'border-top:1px solid var(--dsw-alias-border-l2);',
    rowFirst: 'display:flex;align-items:center;justify-content:space-between;gap:16px;padding:11px 0;',
    label: 'font-size:13px;font-weight:500;',
    sub: 'color:var(--dsw-alias-label-secondary);font-size:12px;margin-top:2px;',
    input: 'width:300px;height:32px;box-sizing:border-box;padding:0 10px;border-radius:8px;'
      + 'border:1px solid var(--dsw-alias-border-l4);background:transparent;'
      + 'color:var(--dsw-alias-label-primary);font-size:13px;font-family:inherit;',
    btn: 'height:34px;box-sizing:border-box;padding:0 16px;border-radius:9px;border:1px solid var(--dsw-alias-border-l2);'
      + 'background:var(--dsw-alias-button-elevated-fill);color:var(--dsw-alias-label-primary);'
      + 'font-size:13px;font-weight:500;cursor:pointer;font-family:inherit;margin-right:10px;',
    btnPrimary: 'height:34px;box-sizing:border-box;padding:0 18px;border-radius:9px;border:1px solid transparent;'
      + 'background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary-inverted);'
      + 'font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;margin-right:10px;',
  };

  function makeSwitch(on, onToggle) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('role', 'switch');
    btn.setAttribute('aria-checked', on ? 'true' : 'false');
    btn.style.cssText = 'width:40px;height:22px;border-radius:999px;flex:none;cursor:pointer;'
      + 'padding:0;position:relative;border:1px solid ' + (on ? 'transparent' : 'var(--dsw-alias-border-l4)') + ';'
      + 'background:' + (on ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-button-floating-hover)') + ';';
    var knob = document.createElement('span');
    knob.style.cssText = 'position:absolute;top:2px;left:' + (on ? 20 : 2) + 'px;width:16px;height:16px;'
      + 'border-radius:50%;transition:left .15s ease;background:'
      + (on ? 'var(--dsw-alias-label-primary-inverted)' : 'var(--dsw-alias-label-secondary)') + ';';
    btn.appendChild(knob);
    btn.addEventListener('click', onToggle);
    return btn;
  }

  function openSettings(dialog, draft) {
    var old = dialog.querySelector('#dsh-boot-panel');
    if (old) old.parentNode.removeChild(old);

    var bg = getComputedStyle(dialog).backgroundColor;
    if (!bg || bg === 'rgba(0, 0, 0, 0)') bg = 'var(--dsw-alias-button-elevated-fill)';

    var page = box(S.page + 'background:' + bg + ';');
    page.id = 'dsh-boot-panel';

    var head = box('display:flex;align-items:center;justify-content:space-between;margin-bottom:2px;');
    head.appendChild(box(S.title, [document.createTextNode(SECTION_LABEL)]));
    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = '\u5173\u95ed';
    closeBtn.style.cssText = S.btn + 'margin:0;';
    closeBtn.addEventListener('click', function () {
      if (page.parentNode) page.parentNode.removeChild(page);
    });
    head.appendChild(closeBtn);
    page.appendChild(head);
    page.appendChild(box(S.hint, [document.createTextNode(
      '下面每一行就是画面上显示的文字，改完点保存，下次启动生效。')]));

    var card = box(S.card);

    function toggleRow(first, label, sub, value, onToggle) {
      var line = box(first ? S.rowFirst : S.row);
      line.appendChild(box('', [box(S.label, [document.createTextNode(label)]), box(S.sub, [document.createTextNode(sub)])]));
      line.appendChild(makeSwitch(value, onToggle));
      card.appendChild(line);
    }

    toggleRow(true, '\u542f\u7528\u542f\u52a8\u52a8\u753b', '\u5173\u6389\u540e\u542f\u52a8\u4e0d\u518d\u64ad\u653e\u3002',
      draft.enabled !== false, function () {
        draft.enabled = draft.enabled === false;
        openSettings(dialog, draft);
      });

    toggleRow(false, '\u64ad\u653e\u58f0\u97f3', '\u6d4f\u89c8\u5668\u4f1a\u62e6\u81ea\u52a8\u64ad\u653e\uff1b\u5f00\u542f\u540e\u4ecd\u9700\u70b9\u4e00\u4e0b\u9875\u9762\u624d\u4f1a\u51fa\u58f0\u3002',
      draft.audio !== false, function () {
        draft.audio = draft.audio === false;
        openSettings(dialog, draft);
      });

    var keyLine = box(S.row);
    keyLine.appendChild(box('', [
      box(S.label, [document.createTextNode('\u8df3\u8fc7\u5feb\u6377\u952e')]),
      box(S.sub, [document.createTextNode('\u70b9\u4e0b\u9762\u7684\u6846\uff0c\u6309\u4e0b\u4f60\u60f3\u8981\u7684\u7ec4\u5408\u952e\u3002')]),
    ]));
    var keyInput = document.createElement('input');
    keyInput.readOnly = true;
    keyInput.value = draft.skipKey || '';
    keyInput.placeholder = '\u6309\u4e00\u4e2a\u952e\u2026';
    keyInput.style.cssText = S.input + 'width:180px;text-align:center;cursor:pointer;';
    keyInput.addEventListener('keydown', function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (/^(Shift|Control|Alt|Meta|OS|CapsLock)$/.test(event.key)) return;
      draft.skipKey = keySpec(event);
      keyInput.value = draft.skipKey;
    });
    keyLine.appendChild(keyInput);
    card.appendChild(keyLine);
    page.appendChild(card);

    page.appendChild(box('margin:18px 0 8px;font-size:14px;font-weight:600;',
      [document.createTextNode('\u753b\u9762\u6587\u5b57')]));

    /* column header above the copy rows: 文字 / 字号 / 颜色 */
    var headRow = box('display:flex;align-items:center;gap:10px;padding:10px 0 8px;'
      + 'color:var(--dsw-alias-label-secondary);font-size:12px;letter-spacing:.02em;line-height:16px;');
    headRow.appendChild(box('width:132px;flex:none;', [document.createTextNode('\u6587\u5b57')]));
    headRow.appendChild(box('flex:1;min-width:0;', [document.createTextNode('\u5185\u5bb9')]));
    headRow.appendChild(box('width:66px;flex:none;text-align:center;', [document.createTextNode('\u5b57\u53f7')]));
    headRow.appendChild(box('width:30px;flex:none;'));
    headRow.appendChild(box('width:40px;flex:none;text-align:center;', [document.createTextNode('\u989c\u8272')]));
    var textCard = box(S.card);
    textCard.appendChild(headRow);
    TEXT_FIELDS.forEach(function (field) {
      var key = field[0];
      var spec = (draft.styles && draft.styles[key]) || {};
      var line = box('display:flex;align-items:center;gap:10px;padding:9px 0;'
        + (textCard.childElementCount > 1 ? 'border-top:1px solid var(--dsw-alias-border-l2);' : ''));

      line.appendChild(box('width:132px;flex:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;',
        [box(S.label, [document.createTextNode(field[1])])]));

      var input = document.createElement('input');
      input.value = (draft.texts && draft.texts[key]) || '';
      input.style.cssText = S.input + 'width:auto;flex:1;min-width:0;';
      input.addEventListener('input', function () {
        draft.texts = draft.texts || {};
        draft.texts[key] = input.value;
      });

      /* free typing: width is whatever you type, committed only while valid */
      var size = document.createElement('input');
      size.type = 'text';
      size.inputMode = 'numeric';
      size.title = '\u5b57\u53f7\uff08px\uff0c\u57fa\u51c6 1280 \u5bbd\u5ea6\uff09\uff0c\u53ef\u76f4\u63a5\u8f93\u5165';
      size.value = spec.size == null ? '' : String(spec.size);
      size.style.cssText = S.input + 'width:66px;flex:none;text-align:center;padding:0 6px;'
        + 'box-sizing:border-box;';

      var color = document.createElement('input');
      color.type = 'color';
      color.title = '\u989c\u8272';
      color.value = spec.color || '#ffffff';
      color.style.cssText = 'width:40px;height:32px;flex:none;box-sizing:border-box;padding:2px;border-radius:8px;'
        + 'border:1px solid var(--dsw-alias-border-l4);background:transparent;cursor:pointer;';

      function commitSize() {
        draft.styles = draft.styles || {};
        var spec2 = draft.styles[key] || {};
        var raw = size.value.trim();
        var n = Number(raw);
        if (raw === '') { delete spec2.size; }
        else if (Number.isFinite(n) && n >= 6 && n <= 200) { spec2.size = n; }
        else {
          n = Math.min(200, Math.max(6, Math.round(Number(raw) || 0)));
          spec2.size = n;
          size.value = String(n);
        }
        draft.styles[key] = spec2;
      }
      size.addEventListener('input', commitSize);
      size.addEventListener('blur', commitSize);

      color.addEventListener('input', function () {
        draft.styles = draft.styles || {};
        var spec2 = draft.styles[key] || {};
        if (/^#[0-9a-fA-F]{6}$/.test(color.value)) spec2.color = color.value;
        draft.styles[key] = spec2;
      });

      var reset = document.createElement('button');
      reset.type = 'button';
      reset.title = '\u6062\u590d\u8be5\u884c\u8bbe\u8ba1\u9ed8\u8ba4';
      reset.textContent = '\u21ba';
      reset.style.cssText = S.btn + 'width:30px;padding:0;flex:none;margin:0;font-size:14px;box-sizing:border-box;';
      reset.addEventListener('click', function () {
        draft.texts = draft.texts || {};
        draft.styles = draft.styles || {};
        draft.texts[key] = DEFAULTS.texts[key];
        draft.styles[key] = clone((DEFAULTS.styles || {})[key] || {});
        openSettings(dialog, draft);
      });

      line.appendChild(input);
      line.appendChild(size);
      line.appendChild(reset);
      line.appendChild(color);
      textCard.appendChild(line);
    });
    page.appendChild(textCard);

    var actions = box('display:flex;align-items:center;margin-top:6px;');
    var status = box('color:var(--dsw-alias-label-secondary);font-size:12px;');
    var saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.textContent = '\u4fdd\u5b58';
    saveBtn.style.cssText = S.btnPrimary;
    saveBtn.addEventListener('click', function () {
      saveConfig(draft).then(function (saved) {
        status.textContent = saved ? '\u5df2\u4fdd\u5b58' : '\u4fdd\u5b58\u5931\u8d25';
        setTimeout(function () { status.textContent = ''; }, 2400);
      });
    });
    var resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.textContent = '\u6062\u590d\u9ed8\u8ba4';
    resetBtn.style.cssText = S.btn;
    resetBtn.addEventListener('click', function () {
      var next = clone(DEFAULTS);
      saveConfig(next).then(function (saved) {
        if (saved) { openSettings(dialog, clone(DEFAULTS)); status.textContent = '\u5df2\u6062\u590d\u9ed8\u8ba4'; }
      });
    });
    var previewBtn = document.createElement('button');
    previewBtn.type = 'button';
    previewBtn.textContent = '\u9884\u89c8\u52a8\u753b';
    previewBtn.style.cssText = S.btn;
    previewBtn.addEventListener('click', function () {
      showSplash(clone(draft), true);
    });
    actions.appendChild(saveBtn);
    actions.appendChild(resetBtn);
    actions.appendChild(previewBtn);
    actions.appendChild(status);
    page.appendChild(actions);

    dialog.appendChild(page);
  }

  function injectSection(dialog) {
    if (!dialog || dialog.getAttribute('data-dsh-boot') === '1') return;
    var buttons = Array.prototype.slice.call(dialog.querySelectorAll('button'));
    var nav = buttons.filter(function (b) {
      var t = (b.textContent || '').trim();
      return NAV_MATCH.some(function (m) { return t.indexOf(m) >= 0; });
    });
    if (!nav.length) return;
    if (!force) {
      var mine = nav.filter(function (b) { return b.hasAttribute('data-dsh-boot-row'); });
      var theirs = nav.filter(function (b) {
        return !b.hasAttribute('data-dsh-boot-row')
          && (b.textContent || '').trim() === SECTION_LABEL;
      });
      if (theirs.length) {
        mine.forEach(function (b) { if (b.parentNode) b.parentNode.removeChild(b); });
        dialog.setAttribute('data-dsh-boot', '1');
        return;
      }
    }

    var template = nav[0];
    var anchor = nav[nav.length - 1];        /* land after the last shipped row */
    if (nav.some(function (b) { return (b.textContent || '').trim() === SECTION_LABEL; })) {
      dialog.setAttribute('data-dsh-boot', '1');
      return;
    }

    var row = template.cloneNode(true);
    row.setAttribute('data-dsh-boot-row', '1');
    /* strip the cloned label text, keep the icon markup */
    var texts = [];
    (function walk(node) {
      for (var i = 0; i < node.childNodes.length; i++) {
        var child = node.childNodes[i];
        if (child.nodeType === 3 && child.nodeValue.trim()) texts.push(child);
        else if (child.nodeType === 1) walk(child);
      }
    })(row);
    if (texts.length) texts[0].nodeValue = SECTION_LABEL;
    else row.appendChild(document.createTextNode(SECTION_LABEL));

    row.addEventListener('click', function () {
      try {
        loadConfig().then(function (conf) {
          /* resolve the live dialog at click time: the shell may have swapped the node */
          var host = (row.closest && row.closest('[role="dialog"]')) || dialog;
          try { openSettings(host, clone(conf)); }
          catch (err) { window.__dshBootLastError = 'open:' + ((err && err.message) || err); }
        }).catch(function (err) { window.__dshBootLastError = 'cfg:' + ((err && err.message) || err); });
      } catch (err) { window.__dshBootLastError = 'click:' + ((err && err.message) || err); }
    });

    anchor.parentNode.insertBefore(row, anchor.nextSibling);
    dialog.setAttribute('data-dsh-boot', '1');
  }

  /* Remove our row once the module half registers its own section: that entry
     is the better one (it lives in the nav model instead of being inserted). */
  function reconcile(dialog) {
    var rows = Array.prototype.slice.call(dialog.querySelectorAll('button[data-dsh-boot-row]'));
    if (!rows.length) return;
    var foreign = Array.prototype.slice.call(dialog.querySelectorAll('button')).filter(function (b) {
      return !b.hasAttribute('data-dsh-boot-row') && (b.textContent || '').trim() === SECTION_LABEL;
    });
    if (!foreign.length) return;
    rows.forEach(function (b) { if (b.parentNode) b.parentNode.removeChild(b); });
  }

  function watchSettings() {
    var seen = new WeakSet();
    function scan() {
      var dialogs = document.querySelectorAll('[role="dialog"]');
      for (var i = 0; i < dialogs.length; i++) {
        var d = dialogs[i];
        if (!(d.textContent || '').match(/\u901a\u7528\u8bbe\u7f6e|\u5185\u7f6e\u63d2\u4ef6/)) continue;
        if (!seen.has(d)) {
          seen.add(d);
          injectSection(d);
        } else {
          reconcile(d);
        }
      }
    }
    var observer = new MutationObserver(function () { scan(); });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    scan();
    document.addEventListener('click', function () { setTimeout(scan, 30); }, true);
  }

  /* ---------------- boot ---------------- */

  loadConfig().then(function () {
    try { runSplash(); } catch (e) {}
    try { watchSettings(); } catch (e) {}
  });
})();
