/* ================================================================== */
/*  Critical Shot — wishlist (customer)                               */
/*  GET /api/wishlist/user/{userId}, DELETE /api/wishlist/remove,     */
/*  per-item GET /api/packages/{id} for full details                  */
/* ================================================================== */
(function () {
  'use strict';
  const CS = window.CS;

  const uid = CS.session.userId;
  const state = { items: [], error: '' };

  function extrasHtml(p) {
    if (!p) return '';
    const ai = p.additionalItems;
    const rows = [];
    if (ai) {
      if (ai.editedImages) rows.push('<li><b>Edited Images:</b> ' + CS.esc(ai.editedImages) + '</li>');
      if (ai.uneditedImages) rows.push('<li><b>Unedited Images:</b> ' + CS.esc(ai.uneditedImages) + '</li>');
      if (ai.thankYouCards) rows.push('<li><b>Thank You Cards:</b> ' + CS.esc(ai.thankYouCards) + '</li>');
      (ai.albums || []).forEach(function (a) { rows.push('<li><b>Album:</b> ' + CS.esc(a.size) + ' ' + CS.esc(a.type) + ' (' + CS.esc(a.spreadCount) + ' spreads)</li>'); });
      (ai.framedPortraits || []).forEach(function (fp) { rows.push('<li><b>Framed Portrait:</b> ' + CS.esc(fp.size) + ' (Quantity: ' + CS.esc(fp.quantity) + ')</li>'); });
    }
    return rows.length
      ? '<div style="margin-top:.75rem"><p style="font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:0 0 .4rem">Additional Items</p><ul style="display:grid;gap:.35rem;font-size:.8rem;color:#4b5563">' + rows.join('') + '</ul></div>'
      : '';
  }

  function card(item, pkg) {
    return '<div class="wl-card" data-pid="' + CS.esc(item.packageId) + '" style="background:#fff;border:1px solid #e5e7eb;border-radius:.75rem;box-shadow:0 1px 2px rgba(0,0,0,.05);padding:1.4rem 1.5rem;display:flex;flex-direction:column">' +
      '<div class="flex align-center justify-between" style="gap:.5rem">' +
        '<h3 style="font-size:1.05rem;font-weight:700;color:#111827;margin:0">' + CS.esc(item.packageName || 'Package') + '</h3>' +
        '<button class="wl-remove" title="Remove from wishlist" aria-label="Remove" ' +
          'data-pid="' + CS.esc(item.packageId) + '" style="display:flex;height:2.1rem;width:2.1rem;align-items:center;justify-content:center;border-radius:9999px;border:0;cursor:pointer;background:#fee2e2;color:#dc2626">' +
          CS.icon('trash', 'h-4 w-4') + '</button>' +
      '</div>' +
      '<span class="badge badge-purple" style="align-self:flex-start;margin-top:.5rem">' + CS.esc(item.packageType) + '</span>' +
      '<p style="font-size:1.15rem;font-weight:800;color:#111827;margin:.9rem 0 0">' + 'Le ' + Number(item.price || 0).toLocaleString() + '</p>' +
      (pkg && (pkg.servicesIncluded || []).length
        ? '<div style="margin-top:.9rem"><p style="font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:0 0 .4rem">Services Included</p>' +
          '<ul style="display:grid;gap:.35rem;font-size:.85rem;color:#4b5563">' +
            pkg.servicesIncluded.map(function (s) { return '<li style="list-style:none;padding-left:1rem;position:relative"><span style="position:absolute;left:0">&bull;</span>' + CS.esc(s) + '</li>'; }).join('') +
          '</ul></div>'
        : '') +
      extrasHtml(pkg) +
      '<div style="margin-top:auto;display:flex;gap:.5rem;padding-top:1.1rem">' +
        '<a class="btn btn-outline btn-sm" href="packages.html" style="flex:1;text-align:center">View</a>' +
        '<a class="btn btn-indigo btn-sm" href="bookings-create.html?packageName=' + encodeURIComponent(item.packageName) + '" style="flex:1;text-align:center">Book Now</a>' +
      '</div>' +
    '</div>';
  }

  function render() {
    const mount = document.getElementById('wl-mount');
    if (state.error) {
      mount.innerHTML = '<div class="card" style="padding:2.5rem;text-align:center">' +
        '<p style="color:#dc2626;margin:0 0 1rem">' + CS.esc(state.error) + '</p>' +
        '<a class="btn btn-indigo" href="index.html">Go Home</a></div>';
      return;
    }
    if (!state.items.length) {
      mount.innerHTML = '<div class="card" style="padding:3rem;text-align:center;color:#6b7280">' +
        CS.icon('heartOutline', 'h-10 w-10') +
        '<p style="font-weight:600;margin:.75rem 0 .25rem;color:#374151">Your wishlist is empty</p>' +
        '<p style="margin:0 0 1.25rem">Start adding packages to your wishlist to see them here.</p>' +
        '<a class="btn btn-indigo" href="packages.html">Browse Packages</a>' +
      '</div>';
      return;
    }

    const per = state.items.map(function (it) {
      if (!it.packageId) return Promise.resolve(null);
      return CS.api.get('/api/packages/' + encodeURIComponent(it.packageId)).catch(function () { return null; });
    });
    Promise.all(per).then(function (pkgs) {
      mount.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.25rem">' +
        state.items.map(function (it, i) { return card(it, pkgs[i]); }).join('') +
      '</div>';
      mount.querySelectorAll('.wl-remove').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const pid = btn.dataset.pid;
          CS.api.del('/api/wishlist/remove?userId=' + encodeURIComponent(uid) + '&packageId=' + encodeURIComponent(pid))
            .then(function () {
              state.items = state.items.filter(function (it) { return String(it.packageId) !== pid; });
              render();
              CS.toast('Removed from wishlist', 'success');
            })
            .catch(function () { CS.toast('Failed to remove from wishlist', 'error'); });
        });
      });
    });
  }

  function load() {
    if (!CS.session.isLoggedIn()) { window.location.href = 'login.html'; return; }
    CS.api.get('/api/wishlist/user/' + encodeURIComponent(uid))
      .then(function (data) { state.items = Array.isArray(data) ? data : []; })
      .catch(function () { state.error = 'Failed to load your wishlist.'; })
      .finally(render);
  }

  window.addEventListener('DOMContentLoaded', load);
})();