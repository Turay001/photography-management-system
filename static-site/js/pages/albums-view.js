/* ================================================================== */
/*  Critical Shot — single album view (customer)                      */
/*  GET /api/albums/:id + full-screen lightbox                        */
/* ================================================================== */
(function () {
  'use strict';
  const CS = window.CS;

  const id = CS.qs('id');
  let album = null;
  let lbIndex = 0;

  function metaBox(label, value) {
    return '<div style="background:#fff;border:1px solid #e5e7eb;border-radius:.6rem;padding:.65rem 1rem">' +
      '<p style="font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:0 0 .15rem">' + label + '</p>' +
      '<p style="font-weight:600;color:#111827;margin:0">' + value + '</p>' +
    '</div>';
  }

  function render() {
    document.title = album.name + ' | Critical Shot';
    document.getElementById('au-name').textContent = album.name;
    document.getElementById('album-hero').style.backgroundImage = album.coverImage ? 'url(' + CS.uploadUrl(album.coverImage) + ')' : '';

    const release = album.releaseDate ? CS.fmtDate(album.releaseDate) : '—';
    document.getElementById('au-meta').innerHTML =
      metaBox('Location', CS.esc(album.location || '—')) +
      metaBox('Category', CS.categoryBadge(album.category)) +
      metaBox('Release Date', CS.esc(release)) +
      metaBox('Status', CS.statusBadge(album.status));

    document.getElementById('au-desc').innerHTML = album.description
      ? '<p style="max-width:46rem;color:#374151;line-height:1.7">' + CS.esc(album.description) + '</p>'
      : '';

    const imgs = album.images || [];
    document.getElementById('au-gallery').innerHTML = imgs.map(function (f, i) {
      return '<button class="g-item" data-i="' + i + '" style="border:0;padding:0;border-radius:.6rem;overflow:hidden;cursor:pointer;aspect-ratio:1/1;background:#e7e5e4;display:block;width:100%">' +
        '<img src="' + CS.uploadUrl(f) + '" alt="Photo ' + (i + 1) + '" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block">' +
      '</button>';
    }).join('');

    document.querySelectorAll('.g-item').forEach(function (b) {
      b.addEventListener('click', function () { openViewer(Number(b.dataset.i)); });
    });
  }

  function openViewer(i) {
    lbIndex = i;
    const lb = document.getElementById('lightbox');
    const img = document.getElementById('lb-img');
    img.src = CS.uploadUrl((album.images || [])[lbIndex]);
    document.getElementById('lb-count').textContent = 'Image ' + (lbIndex + 1) + ' of ' + (album.images || []).length;
    lb.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeViewer() {
    document.getElementById('lightbox').style.display = 'none';
    document.body.style.overflow = '';
  }

  function stepViewer(d) {
    const n = (album.images || []).length;
    lbIndex = (lbIndex + d + n) % n;
    openViewer(lbIndex);
  }

  function bindLightbox() {
    document.getElementById('lb-close').addEventListener('click', closeViewer);
    document.getElementById('lb-prev').addEventListener('click', function () { stepViewer(-1); });
    document.getElementById('lb-next').addEventListener('click', function () { stepViewer(1); });
    document.addEventListener('keydown', function (e) {
      if (document.getElementById('lightbox').style.display === 'none') return;
      if (e.key === 'Escape') closeViewer();
      if (e.key === 'ArrowLeft') stepViewer(-1);
      if (e.key === 'ArrowRight') stepViewer(1);
    });
    document.getElementById('lightbox').addEventListener('click', function (e) {
      if (e.target === document.getElementById('lightbox')) closeViewer();
    });
  }

  function load() {
    if (!CS.session.isLoggedIn()) { window.location.href = 'login.html'; return; }
    if (!id) { window.location.href = 'albums-user.html'; return; }
    bindLightbox();
    CS.api.get('/api/albums/' + encodeURIComponent(id))
      .then(function (data) {
        album = data;
        render();
      })
      .catch(function () {
        document.getElementById('au-name').textContent = 'Album not found';
      });
  }

  window.addEventListener('DOMContentLoaded', load);
})();