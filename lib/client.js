window.__ModuleLoader__.load({
  id: 'dsh-sao-animation',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const CONFIG_URL = '/dsh-boot/config';
    const ANIM_URL = '/dsh-boot/animation.html';
    const SESSION_KEY = 'dsh-boot-played';

    /* Copy fields surfaced in the settings page; keys match the host's TEXT_KEYS. */
    const FIELDS = [
      ['linkBig', 'LINK START 大字'],
      ['linkMono', 'LINK START 副标题'],
      ['connect', '「开始连接」',
        ],
      ['connectMono', '开始连接 副标题'],
      ['chipA', '表盘标签 A', 'OK'],
      ['chipB', '表盘标签 B', 'reasoning'],
      ['chipC', '表盘标签 C', 'context'],
      ['chipD', '表盘标签 D', 'tools'],
      ['pillLeft', '胶囊左', 'Language'],
      ['pillRight', '胶囊右', 'DeepSeek'],
      ['loginTitle', '登录卡标题', 'Log in_'],
      ['fieldA', '字段一', ':account'],
      ['fieldB', '字段二', ':api key'],
      ['tagline', '收尾标语', 'Everything is a Plugin'],
      ['skipLabel', '跳过按钮文字', '点击跳过 / SKIP'],
    ];


    const DEFAULT_CFG = {
      enabled: true,
      audio: true,
      skipKey: 'Escape',
      texts: {
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

    function clone(value) {
      return JSON.parse(JSON.stringify(value));
    }

    /* ---- config ------------------------------------------------------- */

    let cfgCache = null;

    function loadConfig() {
      if (cfgCache) return Promise.resolve(cfgCache);
      return fetch(CONFIG_URL, { credentials: 'same-origin' })
        .then((res) => (res && res.ok ? res.json() : null))
        .then((json) => {
          cfgCache = json && typeof json === 'object' ? json : clone(DEFAULT_CFG);
          return cfgCache;
        })
        .catch(() => {
          cfgCache = clone(DEFAULT_CFG);
          return cfgCache;
        });
    }

    function saveConfig(draft) {
      return fetch(CONFIG_URL, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
        .then((res) => (res && res.ok ? res.json() : null))
        .then((json) => {
          if (json && json.ok && json.config) {
            cfgCache = json.config;
            return json.config;
          }
          return null;
        })
        .catch(() => null);
    }

    /** The animation reads its copy from the URL, so it stays a dumb, cacheable page. */
    function encodeCfg(cfg) {
      try {
        return btoa(encodeURIComponent(JSON.stringify(cfg)));
      } catch (err) {
        return '';
      }
    }

    function animUrl(cfg) {
      const parts = ['once=1'];
      const blob = encodeCfg(cfg);
      /* percent-encode the base64: a raw '+' in a query string is read back as a
         space, which corrupts the payload and makes the custom copy silently vanish */
      if (blob) parts.push('cfg=' + encodeURIComponent(blob));
      if (cfg && cfg.audio === false) parts.push('audio=0');
      return ANIM_URL + '?' + parts.join('&');
    }

    /* ---- keyboard ----------------------------------------------------- */

    function isModifierOnly(key) {
      return key === 'Shift' || key === 'Control' || key === 'Alt' || key === 'Meta'
        || key === 'OS' || key === 'CapsLock';
    }

    function keySpec(event) {
      const parts = [];
      if (event.ctrlKey) parts.push('Ctrl');
      if (event.altKey) parts.push('Alt');
      if (event.shiftKey) parts.push('Shift');
      if (event.metaKey) parts.push('Meta');
      let key = event.key;
      if (key === ' ' || key === 'Spacebar') key = 'Space';
      else if (key === 'Esc') key = 'Escape';
      else if (key.length === 1) key = key.toUpperCase();
      parts.push(key);
      return parts.join('+');
    }

    function matchKey(event, spec) {
      if (!spec) return false;
      const parts = String(spec).split('+').map((s) => s.trim()).filter(Boolean);
      if (!parts.length) return false;
      const key = parts[parts.length - 1].toLowerCase();
      const mods = parts.slice(0, -1).map((s) => s.toLowerCase());
      const wantCtrl = mods.indexOf('ctrl') >= 0;
      const wantAlt = mods.indexOf('alt') >= 0;
      const wantShift = mods.indexOf('shift') >= 0;
      const wantMeta = mods.indexOf('meta') >= 0;
      let actual = event.key;
      if (actual === ' ' || actual === 'Spacebar') actual = 'Space';
      if (actual === 'Esc') actual = 'Escape';
      const hit = actual.toLowerCase() === key
        || String(event.code || '').toLowerCase() === key;
      return hit
        && Boolean(event.ctrlKey) === wantCtrl
        && Boolean(event.altKey) === wantAlt
        && Boolean(event.shiftKey) === wantShift
        && Boolean(event.metaKey) === wantMeta;
    }

    /* ---- styles ------------------------------------------------------- */

    const S = {
      page: {
        padding: '4px 0 40px',
        color: 'var(--dsw-alias-label-primary)',
        fontSize: 13,
        lineHeight: 1.55,
      },
      title: { margin: '0 0 4px', fontSize: 17, fontWeight: 600 },
      hint: { margin: '0 0 16px', color: 'var(--dsw-alias-label-secondary)', fontSize: 12.5 },
      card: {
        border: '1px solid var(--dsw-alias-border-l2)',
        borderRadius: 12,
        padding: '0 16px',
        marginBottom: 14,
      },
      row: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '11px 0',
        borderTop: '1px solid var(--dsw-alias-border-l2)',
      },
      rowFirst: { borderTop: 0 },
      label: { fontSize: 13, fontWeight: 500 },
      sub: { color: 'var(--dsw-alias-label-secondary)', fontSize: 12, marginTop: 2 },
      input: {
        width: 300,
        height: 32,
        boxSizing: 'border-box',
        padding: '0 10px',
        borderRadius: 8,
        border: '1px solid var(--dsw-alias-border-l4)',
        background: 'transparent',
        color: 'var(--dsw-alias-label-primary)',
        fontSize: 13,
        fontFamily: 'inherit',
      },
      actions: { display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 },
      btn: {
        height: 34,
        boxSizing: 'border-box',
        padding: '0 16px',
        borderRadius: 9,
        border: '1px solid var(--dsw-alias-border-l2)',
        background: 'var(--dsw-alias-button-elevated-fill)',
        color: 'var(--dsw-alias-label-primary)',
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer',
        fontFamily: 'inherit',
      },
      btnPrimary: {
        height: 34,
        boxSizing: 'border-box',
        padding: '0 18px',
        borderRadius: 9,
        border: '1px solid transparent',
        background: 'var(--dsw-alias-brand-primary)',
        color: 'var(--dsw-alias-label-primary-inverted)',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'inherit',
      },
      status: { color: 'var(--dsw-alias-label-secondary)', fontSize: 12, marginLeft: 4 },
      aboutTitle: { padding: '12px 0 2px', fontSize: 13, fontWeight: 600 },
      aboutList: { margin: '0 0 12px', padding: '0 0 0 18px', color: 'var(--dsw-alias-label-secondary)', fontSize: 12.5 },
      aboutItem: { margin: '4px 0', lineHeight: 1.6 },
      headRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 0 8px',
        color: 'var(--dsw-alias-label-secondary)',
        fontSize: 12,
        lineHeight: '16px',
      },
      textRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 0',
        borderTop: '1px solid var(--dsw-alias-border-l2)',
      },
      textRowFirst: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 0',
      },
    };

    function Switch(props) {
      return h('button', {
        type: 'button',
        role: 'switch',
        'aria-checked': props.on ? 'true' : 'false',
        onClick: props.onToggle,
        title: props.on ? '已开启' : '已关闭',
        style: {
          width: 40,
          height: 22,
          borderRadius: 999,
          border: '1px solid ' + (props.on ? 'transparent' : 'var(--dsw-alias-border-l4)'),
          background: props.on ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-button-floating-hover)',
          position: 'relative',
          cursor: 'pointer',
          padding: 0,
          flex: 'none',
        },
      }, h('span', {
        style: {
          position: 'absolute',
          top: 2,
          left: props.on ? 20 : 2,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: props.on ? 'var(--dsw-alias-label-primary-inverted)' : 'var(--dsw-alias-label-secondary)',
          transition: 'left .15s ease',
        },
      }));
    }

    /* Preview is a transient artwork overlay, not a plugin page: it is built in
       plain DOM so it does not depend on the overlay slot being mounted, and it
       never relies on window.open (dead inside the desktop shell). */
    function playPreview(cfg) {
      try {
        if (document.getElementById('dsh-boot-preview')) return;
        const st = (cfg && cfg.styles && cfg.styles.skipLabel) || {};
        const wrap = document.createElement('div');
        wrap.id = 'dsh-boot-preview';
        wrap.style.cssText = 'position:fixed;inset:0;z-index:2147483600;background:#0f1115;'
          + 'opacity:1;transition:opacity .35s ease;';
        const frame = document.createElement('iframe');
        frame.src = animUrl(cfg);
        frame.setAttribute('allow', 'autoplay');
        frame.style.cssText = 'width:100%;height:100%;border:0;display:block;background:#0f1115;';
        const skip = document.createElement('div');
        skip.textContent = (cfg.texts && cfg.texts.skipLabel) || DEFAULT_CFG.texts.skipLabel;
        skip.style.cssText = 'position:absolute;right:18px;bottom:16px;padding:7px 14px;'
          + 'border:1px solid rgba(255,255,255,.22);border-radius:999px;'
          + 'color:' + (st.color || '#cfd6e2') + ';font:'
          + (st.size ? (st.size * (window.innerWidth / 1280)) : 12)
          + 'px/1.2 system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:.08em;'
          + 'cursor:pointer;background:rgba(8,10,14,.55);user-select:none;z-index:1;';

        let closed = false;
        function close() {
          if (closed) return;
          closed = true;
          window.removeEventListener('message', onMessage);
          window.removeEventListener('keydown', onKey, true);
          wrap.style.opacity = '0';
          setTimeout(() => { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }, 400);
        }
        function onMessage(event) { if (event && event.data === 'dsh-boot-done') close(); }
        function onKey(event) {
          if (event.key === 'Escape' || event.key === 'Esc') { event.preventDefault(); close(); }
        }
        skip.addEventListener('click', close);
        window.addEventListener('message', onMessage);
        window.addEventListener('keydown', onKey, true);
        setTimeout(close, 21000);

        wrap.appendChild(frame);
        wrap.appendChild(skip);
        document.body.appendChild(wrap);
      } catch (err) {
        try { console.warn('[dsh-sao-animation] preview failed:', err); } catch (e) {}
      }
    }

    /* One copy row. The size field keeps its own text so a half-typed number
       is never overwritten by the controlled value. */
    function CopyRow(props) {
      const [sizeText, setSizeText] = React.useState(props.size == null ? '' : String(props.size));

      React.useEffect(() => {
        setSizeText(props.size == null ? '' : String(props.size));
      }, [props.size]);

      function commit(raw) {
        const text = String(raw).trim();
        const n = Number(text);
        if (text === '') { props.onSize(undefined); return; }
        if (Number.isFinite(n) && n >= 6 && n <= 200) { props.onSize(n); return; }
        if (!props.allowPartial) {
          const clamped = Math.min(200, Math.max(6, Math.round(n || 6)));
          props.onSize(clamped);
          setSizeText(String(clamped));
        }
      }

      return h('div', { style: S.textRow },
        h('div', { style: { width: 132, flex: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
          h('div', { style: S.label }, props.label)),
        h('input', {
          value: props.value,
          placeholder: props.placeholder || '',
          spellCheck: false,
          onChange: (event) => props.onText(event.target.value),
          style: Object.assign({}, S.input, { width: 'auto', flex: 1, minWidth: 0 }),
        }),
        h('input', {
          type: 'text',
          inputMode: 'numeric',
          title: '字号（px，基准 1280 宽度），可直接输入',
          value: sizeText,
          onChange: (event) => {
            setSizeText(event.target.value);
            const text = event.target.value.trim();
            const n = Number(text);
            if (text === '') props.onSize(undefined);
            else if (Number.isFinite(n) && n >= 6 && n <= 200) props.onSize(n);
          },
          onBlur: () => commit(sizeText),
          style: Object.assign({}, S.input, { width: 66, flex: 'none', textAlign: 'center', padding: '0 6px' }),
        }),
        h('button', {
          type: 'button',
          title: '恢复该行设计默认',
          onClick: props.onReset,
          style: Object.assign({}, S.btn, {
          width: 30, padding: 0, flex: 'none', margin: 0, fontSize: 14, boxSizing: 'border-box',
        }),
        }, '\u21ba'),
        h('input', {
          type: 'color',
          title: '颜色',
          value: props.color || '#ffffff',
          onChange: (event) => props.onColor(event.target.value),
          style: {
            width: 40,
            height: 32,
            flex: 'none',
            boxSizing: 'border-box',
            padding: 2,
            borderRadius: 8,
            border: '1px solid var(--dsw-alias-border-l4)',
            background: 'transparent',
            cursor: 'pointer',
          },
        }));
    }

    /* ---- settings page ------------------------------------------------ */

    function SettingsPage() {
      const [draft, setDraft] = React.useState(null);
      const [status, setStatus] = React.useState('');
      const [busy, setBusy] = React.useState(false);

      React.useEffect(() => {
        let alive = true;
        loadConfig().then((cfg) => { if (alive) setDraft(clone(cfg)); });
        return () => { alive = false; };
      }, []);

      if (!draft) {
        return h('div', { style: S.page }, h('div', { style: S.hint }, '读取配置中…'));
      }

      const texts = draft.texts || {};

      function patch(patchValue) {
        setDraft((prev) => Object.assign({}, prev, patchValue));
      }

      function patchText(key, value) {
        setDraft((prev) => Object.assign({}, prev, {
          texts: Object.assign({}, prev.texts, { [key]: value }),
        }));
      }

      function save() {
        setBusy(true);
        saveConfig(draft).then((saved) => {
          setBusy(false);
          setStatus(saved ? '已保存' : '保存失败（宿主没接住请求）');
          if (saved) setDraft(clone(saved));
          setTimeout(() => setStatus(''), 2600);
        });
      }

      function reset() {
        const next = clone(DEFAULT_CFG);
        setDraft(next);
        setBusy(true);
        saveConfig(next).then((saved) => {
          setBusy(false);
          setStatus(saved ? '已恢复默认' : '恢复失败');
          setTimeout(() => setStatus(''), 2600);
        });
      }

      function preview() {
        playPreview(clone(draft));
      }

      const rows = [
        h('div', { key: 'enable', style: Object.assign({}, S.row, S.rowFirst) },
          h('div', null,
            h('div', { style: S.label }, '启用启动动画'),
            h('div', { style: S.sub }, '关闭后启动不再播放，设置页仍然保留。')),
          h(Switch, { on: draft.enabled !== false, onToggle: () => patch({ enabled: draft.enabled === false }) })),

        h('div', { key: 'audio', style: S.row },
          h('div', null,
            h('div', { style: S.label }, '播放声音'),
            h('div', { style: S.sub }, '浏览器会拦自动播放；开启后仍需点一下页面才会出声。')),
          h(Switch, { on: draft.audio !== false, onToggle: () => patch({ audio: draft.audio === false }) })),

        h('div', { key: 'skip', style: S.row },
          h('div', null,
            h('div', { style: S.label }, '跳过快捷键'),
            h('div', { style: S.sub }, '点下面的框，按下你想要的组合键（默认 Escape）。')),
          h('input', {
            readOnly: true,
            value: draft.skipKey || '',
            placeholder: '按一个键…',
            onKeyDown: (event) => {
              event.preventDefault();
              event.stopPropagation();
              if (isModifierOnly(event.key)) return;
              patch({ skipKey: keySpec(event) });
            },
            style: Object.assign({}, S.input, { width: 180, textAlign: 'center', cursor: 'pointer' }),
          })),
      ];

      const styles = draft.styles || {};

      function patchStyle(key, field, value) {
        setDraft((prev) => {
          const next = Object.assign({}, prev, {
            styles: Object.assign({}, prev.styles, {
              [key]: Object.assign({}, (prev.styles || {})[key], { [field]: value }),
            }),
          });
          return next;
        });
      }

      function resetField(key) {
        setDraft((prev) => {
          const next = clone(prev);
          next.texts = next.texts || {};
          next.styles = next.styles || {};
          next.texts[key] = DEFAULT_CFG.texts[key];
          next.styles[key] = clone((DEFAULT_CFG.styles || {})[key] || {});
          return next;
        });
      }

      const inputs = FIELDS.map(([key, label, placeholder]) => {
        const spec = styles[key] || {};
        return h(CopyRow, {
          key,
          label,
          placeholder,
          value: texts[key] == null ? '' : texts[key],
          size: spec.size,
          color: spec.color,
          onText: (value) => patchText(key, value),
          onSize: (value) => patchStyle(key, 'size', value),
          onColor: (value) => patchStyle(key, 'color', value),
          onReset: () => resetField(key),
        });
      });

      const headRow = h('div', { key: '__head', style: S.headRow },
        h('div', { style: { width: 132, flex: 'none' } }, '文字'),
        h('div', { style: { flex: 1, minWidth: 0 } }, '内容'),
        h('div', { style: { width: 66, flex: 'none', textAlign: 'center' } }, '字号'),
        h('div', { style: { width: 30, flex: 'none' } }),
        h('div', { style: { width: 40, flex: 'none', textAlign: 'center' } }, '颜色'));

      return h('div', { style: S.page },
        h('h1', { style: S.title }, 'SAO启动设置'),
        h('p', { style: S.hint },
          '下面每一行就是画面上显示的文字，改完点保存，下次启动生效。'),
        h('div', { style: S.card }, rows),
        h('h2', { style: Object.assign({}, S.title, { fontSize: 14, margin: '18px 0 8px' }) }, '画面文字'),
        h('div', { style: S.card }, [headRow].concat(inputs)),
        h('div', { style: S.actions },
          h('button', { type: 'button', style: S.btnPrimary, onClick: save, disabled: busy }, '保存'),
          h('button', { type: 'button', style: S.btn, onClick: reset, disabled: busy }, '恢复默认'),
          h('button', { type: 'button', style: S.btn, onClick: preview }, '预览动画'),
          h('span', { style: S.status }, status)),
      );
    }

    /* ---- splash overlay ----------------------------------------------- */

    /* The settings page lives in the same module, so a module-level hook is the
       shortest path from "预览动画" to a real overlay. window.open is useless in
       the desktop shell, which is why preview must render here too. */
    let previewHandler = null;

    function Overlay(props) {
      return h('div', {
        id: 'dsh-boot-splash',
        style: {
          position: 'fixed',
          inset: 0,
          zIndex: 2147483600,
          background: '#0f1115',
          opacity: 1,
          transition: 'opacity .4s ease',
          pointerEvents: 'auto',
        },
      },
      props.src ? h('iframe', {
        id: 'dsh-boot-frame',
        src: props.src,
        allow: 'autoplay',
        title: 'boot animation',
        style: { width: '100%', height: '100%', border: 0, display: 'block', background: '#0f1115' },
      }) : null,
      h('div', {
        onClick: props.onClose,
        style: {
          position: 'absolute',
          right: 18,
          bottom: 16,
          padding: '7px 14px',
          border: '1px solid rgba(255,255,255,.22)',
          borderRadius: 999,
          color: props.color || '#cfd6e2',
          font: (props.size || 12) + 'px/1.2 system-ui, -apple-system, "Segoe UI", sans-serif',
          letterSpacing: '.08em',
          cursor: 'pointer',
          background: 'rgba(8,10,14,.55)',
          userSelect: 'none',
          zIndex: 1,
        },
      }, props.label));
    }

    function Splash() {
      const [phase, setPhase] = React.useState(() => {
        let params = null;
        let hash = '';
        try {
          params = new URLSearchParams(location.search);
          hash = String(location.hash || '');
        } catch (err) { params = null; }
        if ((params && params.has('noboot')) || hash.indexOf('noboot') >= 0) return 'off';
        const force = Boolean((params && params.has('boot')) || hash.indexOf('boot') >= 0);
        if (!force) {
          try {
            if (sessionStorage.getItem(SESSION_KEY) === '1') return 'off';
            sessionStorage.setItem(SESSION_KEY, '1');
          } catch (err) { /* private mode: play anyway */ }
        }
        return 'boot';
      });
      const [src, setSrc] = React.useState('');
      const [label, setLabel] = React.useState(DEFAULT_CFG.texts.skipLabel);
      const [skipKey, setSkipKey] = React.useState(DEFAULT_CFG.skipKey);
      const [preview, setPreview] = React.useState(null);
      const [skipStyle, setSkipStyle] = React.useState({});

      const close = React.useCallback(() => {
        setPhase((prev) => (prev === 'off' ? prev : 'closing'));
        setTimeout(() => setPhase('off'), 420);
      }, []);

      /* preview requests from the settings page */
      React.useEffect(() => {
        previewHandler = (cfg) => {
          const st = (cfg && cfg.styles && cfg.styles.skipLabel) || {};
          setPreview({
            src: animUrl(cfg),
            label: (cfg && cfg.texts && cfg.texts.skipLabel) || DEFAULT_CFG.texts.skipLabel,
            color: st.color,
            size: st.size,
          });
        };
        return () => { previewHandler = null; };
      }, []);

      React.useEffect(() => {
        if (phase !== 'boot') return undefined;
        if (window.__dshBootSplashShown) { setPhase('off'); return undefined; }
        try { window.__dshBootSplashShown = true; } catch (err) {}
        let alive = true;
        loadConfig().then((cfg) => {
          if (!alive) return;
          if (cfg.enabled === false) { setPhase('off'); return; }
          const st = (cfg.styles && cfg.styles.skipLabel) || {};
          setLabel((cfg.texts && cfg.texts.skipLabel) || DEFAULT_CFG.texts.skipLabel);
          setSkipKey(cfg.skipKey || 'Escape');
          setSrc(animUrl(cfg));
          setSkipStyle(st);
        });
        return () => { alive = false; };
      }, [phase]);

      React.useEffect(() => {
        if (phase === 'off') return undefined;
        function onMessage(event) {
          if (event && event.data === 'dsh-boot-done') close();
        }
        function onKey(event) {
          if (matchKey(event, skipKey)) {
            event.preventDefault();
            close();
          }
        }
        window.addEventListener('message', onMessage);
        window.addEventListener('keydown', onKey, true);
        const timer = setTimeout(close, 21000);
        return () => {
          window.removeEventListener('message', onMessage);
          window.removeEventListener('keydown', onKey, true);
          clearTimeout(timer);
        };
      }, [phase, skipKey, close]);

      /* Esc closes a preview; the preview never touches the boot gate */
      React.useEffect(() => {
        if (!preview) return undefined;
        function onKey(event) {
          if (event.key === 'Escape' || event.key === 'Esc' || matchKey(event, skipKey)) {
            event.preventDefault();
            setPreview(null);
          }
        }
        function onMessage(event) {
          if (event && event.data === 'dsh-boot-done') setPreview(null);
        }
        window.addEventListener('keydown', onKey, true);
        window.addEventListener('message', onMessage);
        return () => {
          window.removeEventListener('keydown', onKey, true);
          window.removeEventListener('message', onMessage);
        };
      }, [preview, skipKey]);

      if (preview) {
        return h(Overlay, {
          src: preview.src,
          label: preview.label,
          color: preview.color,
          size: preview.size,
          onClose: () => setPreview(null),
        });
      }

      if (phase === 'off') return null;

      return h(Overlay, {
        src,
        label,
        color: skipStyle.color,
        size: skipStyle.size,
        onClose: close,
      });
    }


    return {
      inject: ['slots'],
      apply(ctx) {
        /* marks the module half as present, so the DOM half stands down */
        try { window.__dshBootModule = true; } catch (err) {}
        ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay',
          id: 'dsh-boot-splash',
        'data-phase': phase,
          order: 100,
        }, Splash));

        ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section',
          id: 'boot-animation',
          order: 90,
          label: 'SAO启动设置',
        }, SettingsPage));
      },
    };
  },
});
