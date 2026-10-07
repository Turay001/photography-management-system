/* ================================================================== */
/*  Critical Shot — manage albums (admin)                             */
/*  GET /api/albums, DELETE /api/albums/:id, PDF via CS.pdf           */
/* ================================================================== */
(function () {
  'use strict';
  const CS = window.CS;

  const state = { albums: [], search: '', loading: false };

  function albumGrid(album) {
    const imgs = album.images || [];
    let cells = '';
    for (let i = 0; i < 4; i++) {
      cells += '<div style="aspect-ratio:4/3;overflow:hidden;background:#e7e5e4">' +
        (imgs[i] ? '<img src="' + CS.uploadUrl(imgs[i]) + '" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block">' : '') +
      '</div>';
    }
    return '<div class="al-card" data-id="' + CS.esc(album.id) + '" style="background:#fff;border:1px solid #e5e7eb;border-radius:.75rem;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,.05)">' +
      '<div onClick="window.location.href=\'albums-edit.html?id=' + encodeURIComponent(album.id) + '\'" style="cursor:pointer">' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:2px">' + cells + '</div>' +
        '<div style="padding:1rem 1.1rem">' +
          '<h3 style="font-size:1.02rem;font-weight:700;color:#111827;margin:0 0 .15rem">' + CS.esc(album.name) + '</h3>' +
          '<p style="font-size:.8rem;color:#6b7280;margin:0 0 .7rem">' + CS.esc(album.location || '—') + ' · ' + (album.images || []).length + ' photos</p>' +
          '<div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">' + CS.categoryBadge(album.category) + CS.statusBadge(album.status) + '</div>' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;gap:.5rem;padding:.75rem 1.1rem;border-top:1px solid #f3f4f6">' +
        '<button class="btn btn-outline btn-sm" data-act="download" style="flex:1">Download</button>' +
        '<a class="btn btn-outline btn-sm" href="albums-edit.html?id=' + encodeURIComponent(album.id) + '" style="flex:1;text-align:center">Edit</a>' +
        '<button class="btn btn-danger-light btn-sm" data-act="delete" style="flex:1">Delete</button>' +
      '</div>' +
    '</div>';
  }

  function render() {
    const mount = document.getElementById('al-mount');
    if (state.loading && !state.albums.length) {
      mount.innerHTML = '<div class="loading-block"><span class="spinner spinner-dark"></span> Loading albums...</div>';
      return;
    }
    const q = state.search.trim().toLowerCase();
    const list = state.albums.filter(function (a) { return !q || String(a.name || '').toLowerCase().includes(q); });
    if (!list.length) {
      mount.innerHTML = '<div class="card" style="padding:3rem;text-align:center;color:#6b7280">' +
        (state.albums.length ? 'No albums match your search.' : 'No albums yet. Click "Add a New Album" to create your first collection.') +
      '</div>';
      return;
    }
    mount.innerHTML = '<div class="al-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.25rem">' + list.map(albumGrid).join('') + '</div>';
    bind();
  }

  function bind() {
    const mount = document.getElementById('al-mount');
    mount.querySelectorAll('[data-act="delete"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const card = btn.closest('.al-card');
        const id = card.dataset.id;
        const album = state.albums.find(function (a) { return String(a.id) === id; });
        CS.confirm('Are you sure you want to delete the album "' + (album ? album.name : '') + '"? This action cannot be undone.', 'Delete Album')
          .then(function (ok) {
            if (!ok) return;
            CS.api.del('/api/albums/' + encodeURIComponent(id))
              .then(function () {
                state.albums = state.albums.filter(function (a) { return String(a.id) !== id; });
                render();
                CS.toast('Album deleted successfully', 'success');
              })
              .catch(function () {
                CS.toast('Failed to delete album', 'error');
              });
          });
      });
    });
    mount.querySelectorAll('[data-act="download"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const id = btn.closest('.al-card').dataset.id;
        const album = state.albums.find(function (a) { return String(a.id) === id; });
        downloadAlbumPdf(album);
      });
    });
  }

  async function downloadAlbumPdf(album) {
    const imgs = album.images || [];
    if (!imgs.length) { CS.toast('This album has no photos to export', 'error'); return; }
    CS.toast('Preparing PDF...', 'info');
    try {
      const loaded = [];
      for (const f of imgs) {
        try {
          const j = await CS.pdfImage(CS.uploadUrl(f));
          loaded.push(j);
        } catch (e) { /* skip broken image */ }
      }
      if (!loaded.length) { CS.toast('Could not load any album photos', 'error'); return; }

      const pdf = CS.pdf.create('album_' + (album.name || 'album').replace(/[\\/:]/g, '-') + '.pdf');
      const pageW = pdf.width;
      const x = 40;
      let y = 60;
      pdf.text(album.name || 'Album', x, y, { size: 26, bold: true });
      y += 30;
      if (album.description) { pdf.text(album.description.substring(0, 120), x, y, { size: 11, color: [107, 114, 128] }); y += 22; }

      loaded.forEach(function (j) {
        pdf.addPage();
        const maxW = pageW - 80;
        const maxH = pdf.height - 140;
        const scale = Math.min(maxW / j.width, maxH / j.height);
        const w = j.width * scale;
        const h = j.height * scale;
        pdf.image(j.dataUrl, (pageW - w) / 2, pdf.height - 70, w, h);
      });
      pdf.save();
      CS.toast('Album PDF downloaded', 'success');
    } catch (e) {
      CS.toast('Failed to generate PDF', 'error');
    }
  }

  function load() {
    if (String(CS.session.role || '').toUpperCase() !== 'ADMIN') {
      window.location.href = 'login.html';
      return;
    }
    CS.renderAdminShell('admin-shell');
    document.getElementById('al-search').addEventListener('input', function (e) { state.search = e.target.value; render(); });
    state.loading = true;
    render();
    CS.api.get('/api/albums')
      .then(function (data) {
        state.albums = Array.isArray(data) ? data : [];
      })
      .catch(function () {
        state.albums = [];
        CS.toast('Failed to load albums', 'error');
      })
      .finally(function () { state.loading = false; render(); });
  }

  window.addEventListener('DOMContentLoaded', load);
})();