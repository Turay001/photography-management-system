/* ================================================================== */
/*  Critical Shot PMS — core runtime (vanilla JS)                      */
/* ================================================================== */
(function () {
  'use strict';

  const CS = window.CS = {};

  /* ----------------------------- config ---------------------------- */
  CS.API_BASE = 'http://localhost:8080';
  const BASE = CS.API_BASE;

  /* ------------- standalone local data layer (no backend) ----------- */
  if (!window.CS_MOCK && !document._pmsMockLoaded) {
    document._pmsMockLoaded = true;
    document.write('<script src="js/db.js"><\/script>');
  }

  /* ----------------------------- session --------------------------- */
  CS.session = {
    get userId() { return sessionStorage.getItem('userId') || ''; },
    get email() { return sessionStorage.getItem('email') || ''; },
    get role() { return sessionStorage.getItem('role') || ''; },
    get token() { return sessionStorage.getItem('token') || ''; },
    isLoggedIn() { return !!sessionStorage.getItem('userId'); },
    save(data) {
      if (data.userId) sessionStorage.setItem('userId', data.userId);
      if (data.role) sessionStorage.setItem('role', data.role);
      if (data.email) sessionStorage.setItem('email', data.email);
      if (data.token) sessionStorage.setItem('token', data.token);
      window.dispatchEvent(new Event('loginStateChange'));
    },
    clear() { sessionStorage.clear(); window.dispatchEvent(new Event('loginStateChange')); },
    notify() { window.dispatchEvent(new Event('loginStateChange')); }
  };

  /* ------------------------- authorization -------------------------- */
  /* Centralised page guards. The data layer repeats the same checks
     server-side (see js/db.js requireUser / requireAdmin / ownsOrAdmin),
     so a page that forgets a guard can never expose a protected action. */
  CS.auth = {
    /* Returns true when the visitor may continue, otherwise redirects. */
    requireLogin(redirectTo) {
      if (!CS.session.isLoggedIn()) {
        window.location.href = redirectTo || 'login.html';
        return false;
      }
      return true;
    },
    requireRole(role, redirectTo) {
      const have = String(CS.session.role || '').toUpperCase();
      if (!have) { window.location.href = redirectTo || 'login.html'; return false; }
      if (have !== String(role || '').toUpperCase()) {
        window.location.href = 'index.html';
        return false;
      }
      return true;
    }
  };

  /* ------------------------------- API ----------------------------- */
  function localReq(method, url, body, headers, opts) {
    const mock = window.CS_MOCK;
    if (!mock) return Promise.reject(new Error('Local data layer is not loaded'));
    /* Every request carries the signed-in user's id so the data layer can
       enforce authentication and ownership checks (never trust the body). */
    const h = Object.assign({}, headers || {});
    const me = sessionStorage.getItem('userId');
    if (me && !h.Userid && !h.userId) h.Userid = me;
    const o = { headers: h, body: body };
    if (opts && opts.credentials) o.credentials = opts.credentials;
    return mock.request(method, url, o);
  }

  function readFileData(file) {
    return new Promise(function (resolve, reject) {
      const r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(new Error('Could not read file: ' + file.name)); };
      r.readAsDataURL(file);
    });
  }

  function parseForm(fd) {
    const entries = [];
    return Promise.all(Array.from(fd.keys()).map(function (key) {
      return Promise.all(fd.getAll(key).map(function (v) {
        if (v && typeof v === 'object' && typeof v.name === 'string' && typeof v.size === 'number') {
          return readFileData(v).then(function (dataUrl) { entries.push({ key: key, value: dataUrl }); });
        }
        entries.push({ key: key, value: v });
        return Promise.resolve();
      }));
    })).then(function () {
      const body = {};
      entries.forEach(function (e) {
        if (body[e.key] === undefined) body[e.key] = [];
        body[e.key].push(e.value);
      });
      Object.keys(body).forEach(function (k) {
        if (body[k].length === 1) body[k] = body[k][0];
      });
      return body;
    });
  }

  CS.api = {
    get: (url, opts) => localReq('GET', url, null, opts && opts.headers, opts),
    post: (url, body, headers, opts) => localReq('POST', url, body, headers, opts),
    put: (url, body, headers, opts) => localReq('PUT', url, body, headers, opts),
    del: (url, headers) => localReq('DELETE', url, null, headers),
    patch: (url, body, headers, opts) => localReq('PATCH', url, body, headers, opts),
    multipart: (method, url, fd) => parseForm(fd).then(function (body) {
      return localReq(method, url, body);
    })
  };

  CS.API_BASE = BASE;

  /* ----------------------------- helpers --------------------------- */
  CS.esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  CS.money = function (n) { return Number(n || 0).toLocaleString(); };
  CS.fmtDate = function (d) {
    if (!d) return '—';
    const dt = new Date(d);
    if (isNaN(dt)) return String(d);
    return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };
  CS.fmtDateTime = function (d) {
    if (!d) return '—';
    const dt = new Date(d);
    if (isNaN(dt)) return String(d);
    return dt.toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  CS.fmtLong = function (d) {
    const dt = new Date(d);
    if (isNaN(dt)) return String(d);
    return dt.toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  CS.qs = function (name) { return new URLSearchParams(window.location.search).get(name); };
  CS.uploadUrl = function (f) {
    if (!f) return '';
    if (/^(data:|blob:|https?:|\/)/.test(f)) return f;
    if (/^(images\/|css\/|js\/)/.test(f)) return f;
    return 'images/' + f;
  };

  CS.statusBadge = function (s) {
    const v = String(s || '').toLowerCase();
    const map = {
      upcoming: 'badge-blue', completed: 'badge-gray', cancelled: 'badge-red',
      paid: 'badge-green', pending: 'badge-yellow', refunded: 'badge-red',
      active: 'badge-green', inactive: 'badge-gray'
    };
    const emoji = { upcoming: '🟢', completed: '✅', cancelled: '❌', paid: '💰', pending: '⏳', refunded: '↩️', active: '🟢', inactive: '⚪' };
    return '<span class="badge ' + (map[v] || 'badge-gray') + '">' + (emoji[v] || '❓') + ' ' + CS.esc(s) + '</span>';
  };

  const CAT_COLORS = {
    portrait: ['#ede9fe', '#7c3aed'],
    wedding: ['#fce7f3', '#db2777'],
    commercial: ['#dbeafe', '#2563eb'],
    sports: ['#ffedd5', '#ea580c']
  };

  CS.categoryBadge = function (cat) {
    const c = String(cat || '').toLowerCase();
    const p = CAT_COLORS[c] || ['#f3f4f6', '#6b7280'];
    return '<span style="display:inline-block;padding:.2rem .6rem;border-radius:9999px;font-size:.72rem;font-weight:600;color:' + p[1] + ';background:' + p[0] + '">' + CS.esc(cat || 'General') + '</span>';
  };

  // Gracefully "blank out" images that fail to load (e.g. backend offline on file://)
  document.addEventListener('error', function (ev) {
    const t = ev.target;
    if (t && t.tagName === 'IMG' && !t.dataset.ph) {
      t.dataset.ph = '1';
      t.style.background = '#e7e5e4';
      t.style.opacity = '.18';
    }
  }, true);

  CS.loadScript = function (src) {
    return new Promise(function (resolve, reject) {
      const s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = function () { reject(new Error('failed: ' + src)); };
      document.head.appendChild(s);
    });
  };

  /* ------------------ rule-based assistant runtime ------------------ */
  const AI_LIBS = ['js/business-data.js', 'js/ai-engine.js', 'js/ai-chat-lib.js'];
  CS.ensureAILibs = function () {
    if (window.__aiLibsLoaded) return Promise.resolve();
    const chain = AI_LIBS.reduce(function (p, src) {
      return p.then(function () { return CS.loadScript(src); });
    }, Promise.resolve());
    return chain.then(function () { window.__aiLibsLoaded = true; });
  };

  // On pages built without an inline <div id="ai-mount">, give visitors
  // the floating "Ask the assistant" launcher everywhere.
  window.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('ai-mount')) return;
    if (window.__aiLibsLoaded) return;
    CS.ensureAILibs()
      .then(function () { if (typeof CS.initAssistantLauncher === 'function') CS.initAssistantLauncher(); })
      .catch(function () { /* offline / blocked script — chat silently unavailable */ });
  });

  // Every page that exposes a #site-header / #site-footer mount gets the
  // responsive navbar (desktop links + mobile hamburger panel) automatically.
  window.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('site-header') && typeof CS.renderHeader === 'function') {
      CS.renderHeader('site-header');
    }
    if (document.getElementById('site-footer') && typeof CS.renderFooter === 'function') {
      CS.renderFooter('site-footer');
    }
  });

  /* --------------------------- toast / modal ----------------------- */
  CS.toast = function (msg, type) {
    let wrap = document.querySelector('.toast-wrap');
    if (!wrap) { wrap = document.createElement('div'); wrap.className = 'toast-wrap'; document.body.appendChild(wrap); }
    const t = document.createElement('div');
    t.className = 'toast ' + (type || '');
    t.textContent = msg;
    wrap.appendChild(t);
    setTimeout(function () { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(function () { t.remove(); }, 320); }, 4200);
  };

  CS.modal = function (opts) {
    return new Promise(function (resolve) {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay' + (opts.dark ? ' dark-overlay' : '');
      const icon = opts.icon || '';
      overlay.innerHTML =
        '<div class="modal">' +
          '<div class="modal-head"><h3>' + CS.esc(opts.title || '') + '</h3></div>' +
          '<div class="modal-body">' +
            (opts.kind === 'error' ? '<div class="modal-error">' + icon + ' <div>' + CS.esc(opts.message || '') + '</div></div>' : '<p style="color:#374151">' + CS.esc(opts.message || '') + '</p>') +
          '</div>' +
          '<div class="modal-foot">' +
            (opts.okText ? '<button class="btn btn-indigo modal-ok">' + CS.esc(opts.okText || 'OK') + '</button>' : '') +
            (opts.cancelText ? '<button class="btn btn-outline modal-cancel">' + CS.esc(opts.cancelText || 'Cancel') + '</button>' : '') +
            (opts.closeText ? '<button class="btn btn-outline modal-close">' + CS.esc(opts.closeText || 'Close') + '</button>' : '') +
          '</div>' +
        '</div>';
      function close(val) { overlay.remove(); resolve(val); }
      overlay.querySelector('.modal-ok') && overlay.querySelector('.modal-ok').addEventListener('click', function () { close(true); });
      overlay.querySelector('.modal-cancel') && overlay.querySelector('.modal-cancel').addEventListener('click', function () { close(false); });
      overlay.querySelector('.modal-close') && overlay.querySelector('.modal-close').addEventListener('click', function () { close(false); });
      overlay.addEventListener('click', function (e) { if (e.target === overlay) close(false); });
      document.body.appendChild(overlay);
    });
  };

  CS.alert = function (msg) { return CS.modal({ title: 'Message', message: msg, okText: 'OK' }); };
  CS.confirm = function (msg, title) {
    return CS.modal({ title: title || 'Are you sure?', message: msg, okText: 'Confirm', cancelText: 'Cancel' });
  };

  /* ------------------------------ icons ---------------------------- */
  CS.icon = function (name, cls) {
    const paths = {
      camera: '<path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>',
      video: '<path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>',
      drone: '<path d="M3 15a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zm6 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1v-2zm6 0a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2zM5 13V5a2 2 0 012-2h10a2 2 0 012 2v8M6 3l-3 6M18 3l3 6"/>',
      edit: '<path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>',
      check: '<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>',
      calendar: '<path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>',
      clock: '<path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>',
      users: '<path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>',
      package: '<path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>',
      album: '<path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>',
      dashboard: '<path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>',
      portfolio: '<path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>',
      logout: '<path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>',
      heart: '<path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"/>',
      heartOutline: '<path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" stroke="currentColor" stroke-width="1.5"/>',
      trash: '<path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>',
      download: '<path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>',
      search: '<path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>',
      phone: '<path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>',
      mail: '<path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>',
      person: '<path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>',
      external: '<path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>',
      pin: '<path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z"/>',
      star: '<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>'
    };
    return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" fill="' + (name === 'heart' ? 'currentColor' : 'none') + '" stroke="' + (name === 'heart' ? 'none' : 'currentColor') + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || paths.external) + '</svg>';
  };

  /* --------------------------- header / footer --------------------- */
  const NAV = [
    { label: 'Home', href: 'index.html', section: null },
    { label: 'About', href: null, section: 'about' },
    { label: 'Services', href: null, section: 'services' },
    { label: 'Portfolio', href: null, section: 'portfolio' },
    { label: 'Pricing', href: null, section: 'pricing' },
    { label: 'Assistant', href: null, section: 'ai-assistant', primary: true },
    { label: 'Contact', href: null, section: 'contact' }
  ];

  function landingPath(section) { return (section ? 'index.html#' + section : 'index.html'); }

  let _headerScrollHandler = null;
  let _headerLoginHandler = null;
  let _headerMenuHandler = null;
  let _headerKeyHandler = null;
  let _headerResizeHandler = null;

  CS.renderHeader = function (mountId) {
    const mount = document.getElementById(mountId || 'site-header');
    if (!mount) return;
    mount.className = 'site-header' + (document.body.classList.contains('light') ? ' on-light' : '');
    const email = CS.session.email;
    const logged = CS.session.isLoggedIn();
    const initial = (email || 'C').charAt(0).toUpperCase();

    mount.innerHTML =
      '<nav class="nav-inner">' +
        '<a class="brand" href="index.html" aria-label="Critical Shot — home">' +
          '<span class="brand-mark">' + CS.brandSvg('20', '20') + '</span>' +
          '<span class="brand-name">CRITICAL<span style="color:var(--shot)"> SHOT</span></span>' +
        '</a>' +
        '<div class="nav-links" id="nav-links"></div>' +
        '<div class="nav-actions">' +
          (logged
            ? '<div class="relative" id="nav-account"><button class="account-btn" id="account-btn"><span class="account-avatar">' + CS.esc(initial) + '</span>' + chevron() + '</button></div>'
            : '<button class="nav-action-link" id="nav-signin">Sign In</button>') +
          '<button class="btn-book" id="nav-book">BOOK A SHOOT</button>' +
        '</div>' +
        '<button class="menu-toggle" id="menu-toggle" aria-label="Open menu">' + barsIcon() + '</button>' +
      '</nav>' +
      '<div class="mobile-panel" id="mobile-panel" style="display:none"><div class="mobile-panel-inner" id="mobile-links"></div></div>';

    // desktop links
    const links = document.getElementById('nav-links');
    NAV.forEach(function (item) {
      const a = document.createElement('a');
      a.href = landingPath(item.section);
      a.textContent = item.label;
      if (item.primary) a.classList.add('nav-primary-ai');
      a.dataset.section = item.section || '';
      if (isCurrent(item)) a.classList.add('active');
      a.addEventListener('click', function (e) {
        if (item.section) { e.preventDefault(); goSection(item.section, e); }
      });
      links.appendChild(a);
    });

    // mobile links
    const mlinks = document.getElementById('mobile-links');
    NAV.forEach(function (item) {
      const a = document.createElement('a');
      a.href = landingPath(item.section);
      a.textContent = item.label;
      if (item.primary) a.classList.add('nav-primary-ai');
      a.dataset.section = item.section || '';
      a.addEventListener('click', function (e) {
        closeMobile();
        if (item.section) { e.preventDefault(); goSection(item.section); }
        if (item.href) { window.location.href = item.href; }
      });
      mlinks.appendChild(a);
    });
    const mfoot = document.createElement('div');
    mfoot.className = 'mobile-foot';
    if (logged) {
      mfoot.innerHTML = '<button class="mobile-row" id="m-profile">' + CS.esc(email || 'My account') + '</button>' +
        '<button class="mobile-row" style="color:var(--shot)" id="m-logout">Sign Out</button>';
    } else {
      mfoot.innerHTML = '<button class="mobile-row" id="m-signin">Sign In</button>';
    }
    mfoot.innerHTML += '<button class="btn-book" style="justify-content:center;width:100%" id="m-book">BOOK A SHOOT</button>';
    mlinks.appendChild(mfoot);

    // bind
    mount.querySelector('#menu-toggle').addEventListener('click', function () { toggleMobile(); });
    mount.querySelector('#nav-book').addEventListener('click', function () { goSection('booking'); });
    mount.querySelector('#m-book') && mount.querySelector('#m-book').addEventListener('click', function () { closeMobile(); goSection('booking'); });
    mount.querySelector('#nav-signin') && mount.querySelector('#nav-signin').addEventListener('click', function () { window.location.href = 'login.html'; });
    mount.querySelector('#m-signin') && mount.querySelector('#m-signin').addEventListener('click', function () { window.location.href = 'login.html'; });
    mount.querySelector('#m-logout') && mount.querySelector('#m-logout').addEventListener('click', doLogout);
    mount.querySelector('#account-btn') && mount.querySelector('#account-btn').addEventListener('click', toggleAccount);
    mount.querySelector('#m-profile') && mount.querySelector('#m-profile').addEventListener('click', function () { closeMobile(); goProfile(email); });

    // scroll state
    function onScroll() { mount.classList.toggle('scrolled', window.scrollY > 24); }
    onScroll();
    if (_headerScrollHandler) window.removeEventListener('scroll', _headerScrollHandler);
    _headerScrollHandler = onScroll;
    window.addEventListener('scroll', onScroll, { passive: true });

    if (_headerLoginHandler) window.removeEventListener('loginStateChange', _headerLoginHandler);
    _headerLoginHandler = function () { CS.renderHeader(mountId); };
    window.addEventListener('loginStateChange', _headerLoginHandler);

    // Close the mobile menu on outside click, Escape, or growing past the
    // mobile breakpoint — without stacking duplicate listeners across re-renders.
    if (_headerMenuHandler) document.removeEventListener('click', _headerMenuHandler);
    _headerMenuHandler = function (e) {
      const p = document.getElementById('mobile-panel');
      if (p && p.style.display !== 'none' && !mount.contains(e.target)) closeMobile();
    };
    document.addEventListener('click', _headerMenuHandler);

    if (_headerKeyHandler) document.removeEventListener('keydown', _headerKeyHandler);
    _headerKeyHandler = function (e) { if (e.key === 'Escape') closeMobile(); };
    document.addEventListener('keydown', _headerKeyHandler);

    if (_headerResizeHandler) window.removeEventListener('resize', _headerResizeHandler);
    _headerResizeHandler = function () {
      const p = document.getElementById('mobile-panel');
      if (p && p.style.display !== 'none' && window.innerWidth >= 1024) closeMobile();
    };
    window.addEventListener('resize', _headerResizeHandler);
  };

  function chevron() {
    return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 9l-7 7-7-7"/></svg>';
  }
  function barsIcon() {
    return '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
  }
  function xIcon() {
    return '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 18L18 6M6 6l12 12"/></svg>';
  }

  function isCurrent(item) {
    const here = window.location.pathname.split('/').pop() || 'index.html';
    if (item.href === 'index.html') return here === 'index.html' && !window.location.hash;
    return false;
  }

  function goSection(section, e) {
    const here = window.location.pathname.split('/').pop() || 'index.html';
    if (e) e.preventDefault();
    if (here !== 'index.html') { window.location.href = 'index.html#' + section; return; }
    const el = document.getElementById(section);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    history.replaceState(null, '', '#' + section);
    const links = document.querySelectorAll('#nav-links a');
    links.forEach(function (a) { a.classList.toggle('active', a.dataset.section === section); });
    const mlinks = document.querySelectorAll('#mobile-links a');
    mlinks.forEach(function (a) { a.classList.toggle('active', a.dataset.section === section); });
    closeMobile();
  }

  function toggleMobile() {
    const p = document.getElementById('mobile-panel');
    const hidden = p.style.display === 'none';
    p.style.display = hidden ? 'block' : 'none';
    document.getElementById('menu-toggle').innerHTML = hidden ? xIcon() : barsIcon();
  }
  function closeMobile() {
    const p = document.getElementById('mobile-panel');
    if (p) { p.style.display = 'none'; document.getElementById('menu-toggle').innerHTML = barsIcon(); }
  }

  function toggleAccount() {
    const old = document.querySelector('.account-menu');
    if (old) { old.remove(); return; }
    const wrap = document.getElementById('nav-account');
    const menu = document.createElement('div');
    menu.className = 'account-menu';
    menu.innerHTML = '<button id="acct-profile">' + CS.esc(CS.session.email || 'My account') + '</button>' +
      '<button id="acct-wishlist">Wishlist</button>' +
      '<button id="acct-feedback">Feedback</button>' +
      '<button class="signout" id="acct-logout">Sign Out</button>';
    wrap.appendChild(menu);
    menu.querySelector('#acct-logout').addEventListener('click', doLogout);
    menu.querySelector('#acct-profile').addEventListener('click', function () { goProfile(CS.session.email); });
    menu.querySelector('#acct-wishlist').addEventListener('click', function () { window.location.href = 'wishlist.html'; });
    menu.querySelector('#acct-feedback').addEventListener('click', function () { window.location.href = 'feedback.html'; });
    document.addEventListener('click', function (e) { if (!wrap.contains(e.target)) menu.remove(); }, { once: true });
  }

  function goProfile(email) {
    const role = CS.session.role;
    if (role === 'CUSTOMER') { window.location.href = 'profile.html'; return; }
    CS.api.get('/api/staff/search?email=' + encodeURIComponent(email))
      .then(function (staff) {
        if (staff && staff.id) window.location.href = 'staff-profile.html?id=' + staff.id;
        else window.location.href = 'profile.html';
      })
      .catch(function () { window.location.href = 'profile.html'; });
  }

  function doLogout() {
    CS.session.clear();
    window.location.href = 'index.html';
  }

  CS.doLogout = doLogout;

  CS.brandSvg = function (w, h) {
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="6.5" stroke="currentColor" stroke-width="2.2"/>' +
      '<circle cx="12" cy="12" r="2" fill="currentColor"/>' +
      '<path d="M12 5.5 V2.5 M12 21.5 V18.5 M5.5 12 H2.5 M21.5 12 H18.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>' +
    '</svg>';
  };

  CS.renderFooter = function (mountId) {
    const mount = document.getElementById(mountId || 'site-footer');
    if (!mount) return;
    const year = new Date().getFullYear();
    mount.className = 'site-footer';
    let navHtml = '';
    NAV.forEach(function (n) { navHtml += '<li><a href="' + landingPath(n.section) + '">' + n.label + '</a></li>'; });
    mount.innerHTML =
      '<div class="footer-inner">' +
        '<div class="footer-grid">' +
          '<div class="footer-brand">' +
            '<div class="brand"><span class="brand-mark">' + CS.brandSvg('20', '20') + '</span>' +
              '<span class="brand-name">CRITICAL<span style="color:var(--shot)"> SHOT</span></span></div>' +
            '<h2>YOUR STORY. <span class="shot">OUR SHOT.</span></h2>' +
            '<p>Professional photography, videography and creative media production for people, brands and unforgettable moments across Sierra Leone.</p>' +
          '</div>' +
          '<div class="footer-nav"><h3 class="footer-col-title">Explore</h3><ul>' + navHtml + '</ul></div>' +
          '<div class="footer-contact">' +
            '<h3 class="footer-col-title">Contact</h3>' +
            '<ul>' +
              '<li><a href="tel:+23299738064"><span class="icon">' + CS.icon('phone', 'h20 w20') + '</span>+232 99 738064</a></li>' +
              '<li><a href="mailto:kamaraabdulrahman547@gmail.com"><span class="icon">' + CS.icon('mail', 'h20 w20') + '</span>kamaraabdulrahman547@gmail.com</a></li>' +
            '</ul>' +
            '<button class="btn-book" id="foot-book">BOOK A SHOOT</button>' +
          '</div>' +
        '</div>' +
        '<div class="footer-bottom">' +
          '<p>© ' + year + ' Critical Shot. All rights reserved.</p>' +
          '<p>Founder &amp; CEO — Abdul Rahman Kamara</p>' +
        '</div>' +
      '</div>';
    const book = mount.querySelector('#foot-book');
    if (book) book.addEventListener('click', function () {
      const here = window.location.pathname.split('/').pop() || 'index.html';
      if (here !== 'index.html') window.location.href = 'index.html#booking';
      else document.getElementById('booking') && document.getElementById('booking').scrollIntoView({ behavior: 'smooth' });
    });
  };

  /* ------------------------- admin sidebar -------------------------- */
  const ADMIN_NAV = [
    { name: 'Dashboard', href: 'admin.html', icon: 'dashboard' },
    {
      name: 'Manage Bookings', href: 'bookings-admin.html', icon: 'calendar',
      subs: [{ name: 'Booking List', href: 'bookings-admin.html' }, { name: 'Booking Rules', href: 'bookings-config.html' }]
    },
    { name: 'Manage Albums', href: 'albums.html', icon: 'album' },
    { name: 'Manage Staff', href: 'staff.html', icon: 'users' },
    { name: 'Manage Packages', href: 'packages-admin.html', icon: 'package' },
    { name: 'Manage Portfolio', href: 'portfolio.html', icon: 'portfolio' }
  ];

  function adminActive(href, subs) {
    const here = (window.location.pathname.split('/').pop() || 'index.html').split('?')[0].split('#')[0];
    if (subs) { return subs.some(function (s) { return s.href === here; }); }
    return here === href;
  }
  function adminIsExact() {
    return ['bookings-admin-detail.html'].indexOf((window.location.pathname.split('/').pop() || '').split('?')[0]) >= 0;
  }

  CS.renderAdminShell = function (mountId) {
    const mount = document.getElementById(mountId || 'admin-shell');
    if (!mount) return;
    const email = CS.session.email;
    const role = CS.session.role;
    let navHtml = '';
    ADMIN_NAV.forEach(function (item) {
      if (item.subs) {
        let subs = '';
        item.subs.forEach(function (s) {
          subs += '<a href="' + s.href + '" class="' + (adminActive(s.href) ? 'active' : '') + '">' + s.name + '</a>';
        });
        navHtml += '<div style="margin-bottom:.25rem"><div class="' + (adminActive(item.href, item.subs) ? 'active' : '') + '" style="display:flex;align-items:center;gap:.75rem;padding:.55rem .75rem;border-radius:.4rem;font-size:.875rem;font-weight:500;color:#9ca3af">' + CS.icon(item.icon, 'admin-ic') + item.name + '</div><div class="sub">' + subs + '</div></div>';
      } else {
        navHtml += '<a href="' + item.href + '" class="' + (adminActive(item.href) ? 'active' : '') + '">' + CS.icon(item.icon, 'admin-ic') + item.name + '</a>';
      }
    });

    mount.innerHTML =
      '<div class="admin-sb fixed-sb" id="admin-sb">' +
        '<div class="admin-sb-panel">' +
          '<div class="admin-sb-head"><h1>Admin Panel</h1></div>' +
          '<nav class="admin-nav">' + navHtml + '</nav>' +
          '<div class="admin-sb-foot">' +
            '<div class="who">' +
              '<div class="admin-avatar">' + CS.esc((email || 'A').charAt(0).toUpperCase()) + '</div>' +
              '<div class="admin-who-text"><p>' + CS.esc(email || 'Admin') + '</p><span>' + CS.esc(role) + '</span></div>' +
              '<button class="logout" title="Sign out" id="admin-logout">' + CS.icon('logout', 'h20 w20') + '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="admin-main"><main class="admin-content" id="admin-content"><div id="page-content"></div></main></div>' +
      '<button class="menu-toggle admin-mobile-toggle" id="admin-mobile-toggle" aria-label="Open menu">' + barsIcon() + '</button>';

    // move content
    const contentMount = document.getElementById('page-content');
    const existing = document.getElementById('real-content');
    if (existing) { contentMount.appendChild(existing); }

    const sb = document.getElementById('admin-sb');
    const panel = sb.querySelector('.admin-sb-panel');
    const toggle = document.getElementById('admin-mobile-toggle');

    function openAdminNav() {
      sb.classList.add('mobile-open');
      document.body.classList.add('admin-nav-open');
      document.body.style.overflow = 'hidden';
    }
    function closeAdminNav() {
      sb.classList.remove('mobile-open');
      document.body.classList.remove('admin-nav-open');
      document.body.style.overflow = '';
    }
    function onAdminDoc(e) {
      if (sb.classList.contains('mobile-open') && panel && !panel.contains(e.target)) closeAdminNav();
    }

    document.getElementById('admin-logout').addEventListener('click', function () { CS.session.clear(); window.location.href = 'login.html'; });
    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      if (sb.classList.contains('mobile-open')) closeAdminNav();
      else openAdminNav();
    });
    sb.addEventListener('click', onAdminDoc);
    sb.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', closeAdminNav); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAdminNav(); });
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 768 && sb.classList.contains('mobile-open')) closeAdminNav();
    });
  };

  /* ---------------------------- wishlist ---------------------------- */
  const Wishlist = {
    items: [],
    loading: false,
    loaded: false,
    onChange: [],
    async load() {
      const uid = CS.session.userId;
      this.items = [];
      if (!uid) { this.loaded = true; this.emit(); return; }
      this.loading = true; this.emit();
      try {
        const data = await CS.api.get('/api/wishlist/user/' + encodeURIComponent(uid));
        this.items = Array.isArray(data) ? data : [];
      } catch (e) { this.items = []; }
      this.loading = false; this.loaded = true;
      this.emit();
    },
    async add(item) {
      const uid = CS.session.userId;
      if (!uid) throw new Error('Not logged in');
      const payload = Object.assign({}, item, { userId: uid });
      await CS.api.post('/api/wishlist/add', payload);
      await this.load();
    },
    async remove(packageId) {
      const uid = CS.session.userId;
      if (!uid) throw new Error('Not logged in');
      await CS.api.del('/api/wishlist/remove?userId=' + encodeURIComponent(uid) + '&packageId=' + encodeURIComponent(packageId));
      await this.load();
    },
    isIn(packageId) { return this.items.some(function (i) { return String(i.packageId) === String(packageId); }); },
    emit() { this.onChange.forEach(function (fn) { fn(); }); },
    subscribe(fn) { this.onChange.push(fn); }
  };
  CS.Wishlist = Wishlist;

  CS.wishButton = function (item) {
    const inW = Wishlist.isIn(item.packageId);
    return '<button class="wish-btn" data-package=\'' + JSON.stringify(item).replace(/'/g, '&#39;') + '\' aria-label="Toggle wishlist" style="display:flex;height:2.5rem;width:2.5rem;align-items:center;justify-content:center;border-radius:9999px;border:0;cursor:pointer;' +
      (inW ? 'background:#fee2e2;color:#dc2626' : 'background:#f2f2f5;color:#6b7280') + '">' +
      (inW ? CS.icon('heart', 'h-6 w-6') : CS.icon('heartOutline', 'h-6 w-6')) +
    '</button>';
  };

  // Global wishlist event delegation for .wish-btn
  document.addEventListener('click', function (e) {
    const btn = e.target.closest && e.target.closest('.wish-btn');
    if (!btn) return;
    e.preventDefault();
    if (!CS.session.isLoggedIn()) { window.location.href = 'login.html'; return; }
    const item = JSON.parse(btn.dataset.package);
    const wasIn = Wishlist.isIn(item.packageId);
    btn.style.pointerEvents = 'none';
    const fn = wasIn ? Wishlist.remove(item.packageId) : Wishlist.add(item);
    fn.then(function () {
      if (wasIn) CS.toast('Removed from wishlist', 'error');
      else CS.toast('Added to wishlist', 'success');
    }).catch(function (err) {
      CS.toast(err.message || 'Could not update wishlist', 'error');
    }).finally(function () {
      btn.style.pointerEvents = '';
      if (typeof CS.renderWishButtons === 'function') CS.renderWishButtons();
    });
  });

  CS.renderWishButtons = function () { };

  /* boot: if a wishlist hook present, load */
  if (CS.session.isLoggedIn()) Wishlist.load().catch(function () { });

  /* ------------------------ init reveal observer -------------------- */
  CS.initReveal = function () {
    const els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { io.observe(el); });
  };
  CS.reveal = function (html, delay) {
    return '<div class="reveal"' + (delay ? ' style="transition-delay:' + delay + 'ms"' : '') + '>' + html + '</div>';
  };

})();