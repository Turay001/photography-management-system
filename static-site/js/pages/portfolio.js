/* ================================================================== */
/*  Critical Shot — manage portfolios (admin)                         */
/*  GET /api/portfolio, DELETE /api/portfolio/:id                     */
/* ================================================================== */
(function () {
  'use strict';
  const CS = window.CS;

  const state = { items: [], search: '', loading: false };

  function card(p) {
    return '<div class="po-card" data-id="' + CS.esc(p.id) + '" style="background:#fff;border:1px solid #e5e7eb;border-radius:.75rem;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,.05)">' +
      '<div style="aspect-ratio:4/3;overflow:hidden;background:#e7e5e4">' +
        '<img src="' + CS.uploadUrl(p.imageUrl) + '" alt="' + CS.esc(p.albumName || '') + '" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block">' +
      '</div>' +
      '<div style="padding:1rem 1.1rem">' +
        '<div style="margin-bottom:.4rem">' + CS.categoryBadge(p.category) + '</div>' +
        '<h3 style="font-size:1.02rem;font-weight:700;color:#111827;margin:0 0 .15rem">' + CS.esc(p.albumName || 'Untitled') + '</h3>' +
        '<p style="font-size:.82rem;color:#6b7280;margin:.2rem 0">by ' + CS.esc(p.photographerName || 'Unknown') + '</p>' +
        '<p style="font-size:.78rem;color:#9ca3af;margin:.25rem 0 0">' + CS.fmtDate(p.dateUploaded) + '</p>' +
      '</div>' +
      '<div style="display:flex;gap:.5rem;padding:.75rem 1.1rem;border-top:1px solid #f3f4f6">' +
        '<a class="btn btn-outline btn-sm" href="portfolio-edit.html?id=' + encodeURIComponent(p.id) + '" style="flex:1;text-align:center">Edit</a>' +
        '<button class="btn btn-danger-light btn-sm" data-act="delete" style="flex:1">Delete</button>' +
      '</div>' +
    '</div>';
  }

  function render() {
    const mount = document.getElementById('po-mount');
    if (state.loading && !state.items.length) {
      mount.innerHTML = '<div class="loading-block"><span class="spinner spinner-dark"></span> Loading portfolios...</div>';
      return;
    }
    const q = state.search.trim().toLowerCase();
    const list = state.items.filter(function (p) { return !q || String(p.albumName || '').toLowerCase().includes(q); });
    if (!list.length) {
      mount.innerHTML = '<div class="card" style="padding:3rem;text-align:center;color:#6b7280">' +
        (state.items.length ? 'No portfolios match your search.' : 'No portfolios yet. Click "Add New Portfolio" to showcase your work.') +
      '</div>';
      return;
    }
    mount.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1.25rem">' + list.map(card).join('') + '</div>';
    mount.querySelectorAll('[data-act="delete"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const id = btn.closest('.po-card').dataset.id;
        const item = state.items.find(function (p) { return String(p.id) === id; });
        CS.confirm('Are you sure you want to delete the portfolio "' + (item ? item.albumName : '') + '"?', 'Delete Portfolio')
          .then(function (ok) {
            if (!ok) return;
            btn.textContent = 'Deleting...';
            btn.disabled = true;
            CS.api.del('/api/portfolio/' + encodeURIComponent(id))
              .then(function () {
                state.items = state.items.filter(function (p) { return String(p.id) !== id; });
                render();
                CS.toast('Portfolio deleted successfully', 'success');
              })
              .catch(function () {
                btn.textContent = 'Delete';
                btn.disabled = false;
                CS.toast('Portfolio deletion failed', 'error');
              });
          });
      });
    });
  }

  function load() {
    if (String(CS.session.role || '').toUpperCase() !== 'ADMIN') {
      window.location.href = 'login.html';
      return;
    }
    CS.renderAdminShell('admin-shell');
    document.getElementById('po-search').addEventListener('input', function (e) { state.search = e.target.value; render(); });
    state.loading = true;
    render();
    CS.api.get('/api/portfolio')
      .then(function (data) { state.items = Array.isArray(data) ? data : []; })
      .catch(function () { state.items = []; CS.toast('Failed to load portfolios', 'error'); })
      .finally(function () { state.loading = false; render(); });
  }

  window.addEventListener('DOMContentLoaded', load);
})();