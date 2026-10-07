/* ================================================================== */
/*  Critical Shot — portfolios (customer, read-only)                  */
/*  GET /api/portfolio                                                */
/* ================================================================== */
(function () {
  'use strict';
  const CS = window.CS;

  const state = { items: [], search: '', loading: false };

  function card(p) {
    return '<div class="pu-card" style="background:#fff;border:1px solid #e5e7eb;border-radius:.75rem;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,.05)">' +
      '<div style="aspect-ratio:4/3;overflow:hidden;background:#e7e5e4">' +
        '<img src="' + CS.uploadUrl(p.imageUrl) + '" alt="' + CS.esc(p.albumName || '') + '" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block">' +
      '</div>' +
      '<div style="padding:1rem 1.1rem">' +
        '<div style="margin-bottom:.4rem">' + CS.categoryBadge(p.category) + '</div>' +
        '<h3 style="font-size:1.02rem;font-weight:700;color:#111827;margin:0 0 .15rem">' + CS.esc(p.albumName || 'Untitled') + '</h3>' +
        '<p style="font-size:.82rem;color:#6b7280;margin:.2rem 0">by ' + CS.esc(p.photographerName || 'Unknown') + '</p>' +
        (p.description ? '<p style="font-size:.8rem;color:#9ca3af;margin:.35rem 0 0;line-height:1.5">' + CS.esc(p.description.substring(0, 110)) + '</p>' : '') +
        '<p style="font-size:.78rem;color:#9ca3af;margin:.5rem 0 0">' + CS.fmtDate(p.dateUploaded) + '</p>' +
      '</div>' +
    '</div>';
  }

  function render() {
    const mount = document.getElementById('pu-mount');
    if (state.loading && !state.items.length) {
      mount.innerHTML = '<div class="loading-block"><span class="spinner spinner-dark"></span> Loading portfolios...</div>';
      return;
    }
    const q = state.search.trim().toLowerCase();
    const list = state.items.filter(function (p) { return !q || String(p.albumName || '').toLowerCase().includes(q); });
    if (!list.length) {
      mount.innerHTML = '<div class="card" style="padding:3rem;text-align:center;color:#6b7280">' +
        (state.items.length ? 'No portfolios match your search.' : 'No portfolios available yet. Check back soon!') +
      '</div>';
      return;
    }
    mount.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1.25rem">' + list.map(card).join('') + '</div>';
  }

  function load() {
    document.getElementById('pu-search').addEventListener('input', function (e) { state.search = e.target.value; render(); });
    state.loading = true;
    render();
    CS.api.get('/api/portfolio')
      .then(function (data) { state.items = Array.isArray(data) ? data : []; })
      .catch(function () { state.items = []; })
      .finally(function () { state.loading = false; render(); });
  }

  window.addEventListener('DOMContentLoaded', load);
})();