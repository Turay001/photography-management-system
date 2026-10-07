/* ================================================================== */
/*  Critical Shot — photo albums (customer)                           */
/*  GET /api/albums, favorites via /api/users/:userId/favorites       */
/* ================================================================== */
(function () {
  'use strict';
  const CS = window.CS;

  const state = { albums: [], favorites: [], search: '', loading: false };

  function card(album) {
    const fav = state.favorites.indexOf(String(album.id)) >= 0;
    const imgs = album.images || [];
    let cells = '';
    for (let i = 0; i < 4; i++) {
      cells += '<div style="aspect-ratio:4/3;overflow:hidden;background:#e7e5e4">' +
        (imgs[i] ? '<img src="' + CS.uploadUrl(imgs[i]) + '" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block">' : '') +
      '</div>';
    }
    const firstImg = imgs[0] ? CS.uploadUrl(imgs[0]) : 'images/album-placeholder.jpg';
    return '<div class="au-card" data-id="' + CS.esc(album.id) + '" style="background:#fff;border:1px solid #e5e7eb;border-radius:.75rem;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,.05)">' +
      '<a href="albums-view.html?id=' + encodeURIComponent(album.id) + '" style="display:block;position:relative">' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:2px">' + cells + '</div>' +
        '<div style="padding:1rem 1.1rem">' +
          '<h3 style="font-size:1.02rem;font-weight:700;color:#111827;margin:0 0 .15rem">' + CS.esc(album.name) + '</h3>' +
          '<p style="font-size:.8rem;color:#6b7280;margin:.25rem 0 0">' + CS.categoryBadge(album.category) + '</p>' +
          '<p style="font-size:.8rem;color:#6b7280;margin:.4rem 0 0">' + CS.esc(album.location || '—') + '</p>' +
        '</div>' +
      '</a>' +
      '<button class="au-fav" data-id="' + CS.esc(album.id) + '" aria-label="Favorite" style="position:absolute;top:.7rem;right:.7rem;display:flex;height:2.4rem;width:2.4rem;align-items:center;justify-content:center;border-radius:9999px;border:0;cursor:pointer;' +
        (fav ? 'background:#fecaca;color:#dc2626' : 'background:rgba(255,255,255,.9);color:#6b7280') + '">' +
        (fav ? CS.icon('heart', 'h-5 w-5') : CS.icon('heartOutline', 'h-5 w-5')) +
      '</button>' +
    '</div>';
  }

  function render() {
    const mount = document.getElementById('au-mount');
    if (state.loading && !state.albums.length) {
      mount.innerHTML = '<div class="loading-block"><span class="spinner spinner-dark"></span> Loading albums...</div>';
      return;
    }
    const q = state.search.trim().toLowerCase();
    const list = state.albums.filter(function (a) { return !q || String(a.name || '').toLowerCase().includes(q); });
    if (!list.length) {
      mount.innerHTML = '<div class="card" style="padding:3rem;text-align:center;color:#6b7280">' +
        (state.albums.length ? 'No albums match your search.' : 'No albums available yet. Check back soon!') +
      '</div>';
      return;
    }
    mount.innerHTML = '<div style="position:relative;display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.25rem">' + list.map(card).join('') + '</div>';
    mount.querySelectorAll('.au-fav').forEach(function (btn) {
      btn.addEventListener('click', function () {
        toggleFavorite(btn.dataset.id, btn);
      });
    });
  }

  function toggleFavorite(albumId, btn) {
    const uid = CS.session.userId;
    if (!uid) { window.location.href = 'login.html'; return; }
    const adding = state.favorites.indexOf(albumId) < 0;
    btn.style.pointerEvents = 'none';
    (adding
      ? CS.api.post('/api/users/' + encodeURIComponent(uid) + '/favorites/' + encodeURIComponent(albumId))
      : CS.api.del('/api/users/' + encodeURIComponent(uid) + '/favorites/' + encodeURIComponent(albumId)))
      .then(function () {
        if (adding) { state.favorites.push(albumId); CS.toast('Added to favorites', 'success'); }
        else { state.favorites = state.favorites.filter(function (f) { return f !== albumId; }); CS.toast('Removed from favorites', 'error'); }
        render();
      })
      .catch(function () { CS.toast('Could not update favorites', 'error'); })
      .then(function () { btn.style.pointerEvents = ''; });
  }

  function load() {
    const uid = CS.session.userId;
    if (!uid) { window.location.href = 'login.html'; return; }
    document.getElementById('au-search').addEventListener('input', function (e) { state.search = e.target.value; render(); });
    state.loading = true;
    render();
    Promise.all([
      CS.api.get('/api/albums').catch(function () { return []; }),
      CS.api.get('/api/users/' + encodeURIComponent(uid) + '/favorites').catch(function () { return []; })
    ]).then(function (res) {
      state.albums = Array.isArray(res[0]) ? res[0] : [];
      state.favorites = (Array.isArray(res[1]) ? res[1] : []).map(function (a) { return String(a.id); });
    }).finally(function () {
      state.loading = false;
      render();
    });
  }

  window.addEventListener('DOMContentLoaded', load);
})();