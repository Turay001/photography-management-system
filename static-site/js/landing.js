/* ================================================================== */
/*  Critical Shot — landing page logic                                  */
/* ================================================================== */
(function () {
  'use strict';

  const D = window.LANDING_DATA || {};
  const CS = window.CS;

  function ready(fn) { window.addEventListener('DOMContentLoaded', fn); }

  /* ------------------------- about ------------------------- */
  function renderAbout() {
    const wrap = document.getElementById('about-features');
    if (!wrap) return;
    let checks = '<ul style="margin-top:1.75rem;display:grid;gap:.65rem">';
    (D.aboutFeatures || []).forEach(function (f) {
      checks += '<li style="display:flex;align-items:center;gap:.6rem;font-size:.875rem;color:rgba(255,255,255,.7)">' +
        '<span style="display:flex;height:1.5rem;width:1.5rem;flex-shrink:0;align-items:center;justify-content:center;border-radius:9999px;background:rgba(255,255,255,.15);color:var(--shot)">' + CS.icon('check', 'h-4 w-4') + '</span>' +
        CS.esc(f) + '</li>';
    });
    checks += '</ul>';
    let points = '<div style="margin-top:2rem;display:flex;flex-wrap:wrap;gap:.5rem">';
    (D.aboutPoints || []).forEach(function (p) {
      points += '<span style="display:inline-flex;align-items:center;gap:.5rem;border-radius:9999px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);padding:.4rem .9rem;font-size:.78rem;font-weight:600;color:rgba(255,255,255,.75)">' +
        '<span style="color:var(--shot)">' + CS.icon(mapIcon(p.icon), 'h-4 w-4') + '</span>' + CS.esc(p.label) + '</span>';
    });
    points += '</div>';
    wrap.innerHTML = checks + points;
  }

  function mapIcon(name) {
    return ({ camera: 'camera', video: 'video', spark: 'star', building: 'dashboard' })[name] || 'check';
  }

  /* ------------------------- services ---------------------- */
  function renderServices() {
    const grid = document.getElementById('services-grid');
    if (!grid) return;
    grid.innerHTML = (D.services || []).map(function (s) {
      return '<article class="service-card">' +
        '<div class="top"><img src="' + CS.esc(s.image) + '" alt="">' +
          '<div class="veil"></div>' +
          '<div class="iicon">' + CS.icon(s.icon, 'h-6 w-6') + '</div>' +
        '</div>' +
        '<div class="body">' +
          '<span class="tag">' + CS.esc(s.tagline) + '</span>' +
          '<h3>' + CS.esc(s.title) + '</h3>' +
          '<p>' + CS.esc(s.description) + '</p>' +
          '<div class="chips">' + (s.items || []).map(function (i) { return '<span class="chip">' + CS.esc(i) + '</span>'; }).join('') + '</div>' +
          '<span class="more">Explore →</span>' +
        '</div>' +
      '</article>';
    }).join('');
  }

  /* ------------------------- styles ------------------------ */
  function styleCard(s, isVideo) {
    const h = isVideo ? 'style-fig style-video' : 'style-fig';
    const play = isVideo
      ? '<span class="play"><span class="circle"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span></span>'
      : '';
    return '<button class="' + h + ' style-card" data-src="' + CS.esc(s.image) + '" data-title="' + CS.esc(s.title) + '" style="cursor:pointer;text-align:left;color:#fff">' +
        '<img src="' + CS.esc(s.image) + '" alt="">' + play +
        '<span class="cap"><span>' + CS.esc(s.description) + '</span><h3>' + CS.esc(s.title) + '</h3></span>' +
      '</button>';
  }

  function renderStyles() {
    const ph = document.getElementById('photo-styles');
    if (ph) ph.innerHTML = (D.photoStyles || []).map(function (s) { return styleCard(s, false); }).join('');
    const vh = document.getElementById('video-styles');
    if (vh) vh.innerHTML = (D.videoStyles || []).map(function (s) { return styleCard(s, true); }).join('');
  }

  /* ------------------------- portfolio --------------------- */
  let currentFilter = 'ALL';
  let lightboxList = [];
  let lightboxIndex = 0;

  function filteredItems() {
    return (D.portfolio || []).filter(function (it) {
      return currentFilter === 'ALL' || it.category === currentFilter;
    });
  }

  function renderFilters() {
    const wrap = document.getElementById('port-filters');
    if (!wrap) return;
    wrap.innerHTML = (D.portfolioFilters || []).map(function (f) {
      return '<button class="filter-btn' + (f === currentFilter ? ' active' : '') + '" data-filter="' + CS.esc(f) + '">' + CS.esc(f) + '</button>';
    }).join('');
    wrap.querySelectorAll('.filter-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        currentFilter = b.dataset.filter;
        wrap.querySelectorAll('.filter-btn').forEach(function (x) { x.classList.toggle('active', x === b); });
        renderMasonry();
      });
    });
  }

  function renderMasonry() {
    const m = document.getElementById('port-masonry');
    if (!m) return;
    const items = filteredItems();
    m.innerHTML = items.map(function (it) {
      return '<figure class="masonry-item">' +
        '<button class="port-card port-open" data-i="' + items.indexOf(it) + '" style="aspect-ratio:' + (D.aspects[it.id] || '4/3') + '">' +
          '<span class="rel" style="height:100%"><img src="' + CS.esc(it.image) + '" alt="">' +
            '<span class="veil"></span>' +
            '<span class="cap"><span><p>' + CS.esc(it.note) + '</p><h3>' + CS.esc(it.title) + '</h3></span>' +
              '<span class="expand"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg></span>' +
            '</span>' +
          '</span>' +
        '</button>' +
      '</figure>';
    }).join('');
  }

  function openLightbox(title, src) {
    const frame =
      '<div class="lightbox" id="lightbox">' +
        '<button class="lb-close" id="lb-close" aria-label="Close"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 18L18 6M6 6l12 12"/></svg></button>' +
        '<button class="lb-nav lb-prev" id="lb-prev" aria-label="Previous"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 19l-7-7 7-7"/></svg></button>' +
        '<button class="lb-nav lb-next" id="lb-next" aria-label="Next"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 5l7 7-7 7"/></svg></button>' +
        '<figure class="lb-figure"><div class="lb-frame"><img src="' + CS.esc(src) + '" alt=""></div>' +
          '<figcaption class="lb-cap"><div><p>Critical Shot</p><h3 id="lb-title">' + CS.esc(title) + '</h3></div><span class="lb-count" id="lb-count"></span></figcaption>' +
        '</figure>' +
      '</div>';
    const box = document.createElement('div');
    box.innerHTML = frame.trim();
    const lb = box.firstChild;
    document.body.appendChild(lb);
    document.body.classList.add('lightbox-open');

    const img = lb.querySelector('img');
    img.onerror = function () { img.style.opacity = '.25'; };

    function show() {
      const item = lightboxList[lightboxIndex];
      if (!item) return;
      img.src = item.image;
      lb.querySelector('#lb-title').textContent = item.title;
      lb.querySelector('#lb-count').textContent = (lightboxIndex + 1) + ' / ' + lightboxList.length;
      lb.querySelector('#lb-prev').style.visibility = lightboxList.length > 1 ? 'visible' : 'hidden';
      lb.querySelector('#lb-next').style.visibility = lightboxList.length > 1 ? 'visible' : 'hidden';
    }

    function step(d) {
      lightboxIndex = (lightboxIndex + d + lightboxList.length) % lightboxList.length;
      show();
    }
    function close() { lb.remove(); document.body.classList.remove('lightbox-open'); document.removeEventListener('keydown', onKey); }

    function onKey(e) {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    }

    lb.querySelector('#lb-close').addEventListener('click', close);
    lb.querySelector('#lb-prev').addEventListener('click', function () { step(-1); });
    lb.querySelector('#lb-next').addEventListener('click', function () { step(1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    document.addEventListener('keydown', onKey);
    show();
  }

  /* ------------------------- pricing ----------------------- */
  function renderPricing() {
    const wrap = document.getElementById('pricing-groups');
    if (!wrap) return;
    wrap.innerHTML = (D.pricingGroups || []).map(function (g) {
      const cards = (D.pricing || []).filter(function (p) { return p.type === g.key; });
      let grid = '<div class="price-grid">';
      cards.forEach(function (p) {
        grid += '<div class="price-card">' +
          '<span class="kicker">' + CS.esc(p.note || 'Starting at') + '</span>' +
          '<h4>' + CS.esc(p.name) + '</h4>' +
          '<div class="amount">' + CS.esc(p.price) + '</div>' +
          (p.includes && p.includes.length
            ? '<ul>' + p.includes.map(function (i) { return '<li>' + CS.icon('check', 'h-4 w-4') + '<span>' + CS.esc(i) + '</span></li>'; }).join('') + '</ul>'
            : '') +
        '</div>';
      });
      grid += '</div>';
      return '<div class="price-group">' +
        '<div class="price-group-head"><span>' + CS.esc(g.tag) + '</span><h3>' + CS.esc(g.label) + '</h3><div class="rule"></div></div>' +
        grid +
      '</div>';
    }).join('');
  }

  /* ------------------------- why --------------------------- */
  function renderWhy() {
    const wrap = document.getElementById('why-grid');
    if (!wrap) return;
    wrap.innerHTML = (D.whyPoints || []).map(function (w, i) {
      return '<div class="why-card">' +
        '<span class="big">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<span class="bar"></span>' +
        '<h3>' + CS.esc(w.title) + '</h3>' +
        '<p>' + CS.esc(w.description) + '</p>' +
      '</div>';
    }).join('');
  }

  /* ------------------------- FAQ --------------------------- */
  function renderFaq() {
    const wrap = document.getElementById('faq-list');
    if (!wrap) return;
    wrap.innerHTML = (D.faqs || []).map(function (f, i) {
      return '<div class="faq-item">' +
        '<button class="faq-q" data-i="' + i + '">' +
          '<span class="q">' + CS.esc(f.q) + '</span>' +
          '<span class="icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></span>' +
        '</button>' +
        '<div class="faq-a"><p>' + CS.esc(f.a) + '</p></div>' +
      '</div>';
    }).join('');
    wrap.querySelectorAll('.faq-q').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const item = btn.closest('.faq-item');
        const isOpen = item.classList.contains('open');
        wrap.querySelectorAll('.faq-item.open').forEach(function (x) { x.classList.remove('open'); });
        if (!isOpen) item.classList.add('open');
      });
    });
  }

  /* ------------------------- mount ------------------------- */
  ready(function () {
    renderAbout();
    renderServices();
    renderStyles();
    renderFilters();
    renderMasonry();
    renderPricing();
    renderWhy();
    renderFaq();

    // style cards -> lightbox
    document.querySelectorAll('.style-card').forEach(function (b) {
      b.addEventListener('click', function () {
        lightboxList = [{ image: b.dataset.src, title: b.dataset.title }];
        lightboxIndex = 0;
        openLightbox(lightboxList[0].title, lightboxList[0].image);
      });
    });

    // portfolio -> lightbox (single item lightbox)
    document.getElementById('port-masonry').addEventListener('click', function (e) {
      const btn = e.target.closest('.port-open');
      if (!btn) return;
      e.preventDefault();
      const items = filteredItems();
      lightboxList = items.map(function (it) { return { image: it.image, title: it.title, note: it.note }; });
      lightboxIndex = Number(btn.dataset.i) || 0;
      openLightbox(lightboxList[lightboxIndex].title, lightboxList[lightboxIndex].image);
    });

    // nav scroll highlight on landing
    const navLinks = document.querySelectorAll('#nav-links a[data-section]');
    const sections = (D && D.whyPoints) ? ['about', 'services', 'portfolio', 'pricing', 'ai-assistant', 'contact'] : [];
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            navLinks.forEach(function (a) { a.classList.toggle('active', a.dataset.section === entry.target.id); });
          }
        });
      }, { rootMargin: '-40% 0px -55% 0px' });
      sections.forEach(function (id) { const el = document.getElementById(id); if (el) io.observe(el); });
    }

    if (typeof CS.initReveal === 'function') CS.initReveal();
  });
})();