/* ================================================================== */
/*  Critical Shot — edit portfolio (admin)                            */
/*  GET /api/portfolio/:id, PUT /api/portfolio/:id (multipart)        */
/* ================================================================== */
(function () {
  'use strict';
  const CS = window.CS;

  const id = CS.qs('id');
  const ALLOWED = ['image/jpeg', 'image/png', 'image/gif'];
  const MAX = 10 * 1024 * 1024;

  function render(item, albums, staff) {
    document.getElementById('pe-title').textContent = 'Edit: ' + (item.albumName || 'Portfolio');
    const mount = document.getElementById('pe-mount');
    mount.innerHTML =
      '<div class="card" style="padding:1.5rem 1.75rem 2rem">' +
        '<div class="field" style="margin-bottom:1rem">' +
          '<label>Current Image</label>' +
          '<div style="width:100%;max-width:24rem;aspect-ratio:4/3;border-radius:.6rem;overflow:hidden;border:1px solid #e5e7eb;background:#e7e5e4">' +
            (item.imageUrl ? '<img src="' + CS.uploadUrl(item.imageUrl) + '" alt="" style="width:100%;height:100%;object-fit:cover;display:block">' : '') +
          '</div>' +
        '</div>' +
        '<form id="pe-form" novalidate>' +
          '<div class="field">' +
            '<label for="pe-album">Album Name</label>' +
            '<select id="pe-album" class="input-lite"><option value="">Select an album</option>' +
              albums.map(function (a) { return '<option value="' + CS.esc(a.name) + '"' + (item.albumName === a.name ? ' selected' : '') + '>' + CS.esc(a.name) + '</option>'; }).join('') +
            '</select>' +
          '</div>' +
          '<div class="field"><label for="pe-desc">Description</label><textarea id="pe-desc" class="input-lite" rows="4">' + CS.esc(item.description || '') + '</textarea></div>' +
          '<div class="form-2col">' +
            '<div class="field">' +
              '<label for="pe-photo">Photographer</label>' +
              '<select id="pe-photo" class="input-lite"><option value="">Select a photographer</option>' +
                staff.map(function (s) { return '<option value="' + CS.esc(s.name) + '"' + (item.photographerName === s.name ? ' selected' : '') + '>' + CS.esc(s.name) + '</option>'; }).join('') +
              '</select>' +
            '</div>' +
            '<div class="field">' +
              '<label for="pe-cat">Category</label>' +
              '<select id="pe-cat" class="input-lite">' +
                ['portrait', 'wedding', 'commercial', 'sports'].map(function (c) {
                  return '<option value="' + c + '"' + (item.category === c ? ' selected' : '') + '>' + c.charAt(0).toUpperCase() + c.slice(1) + '</option>';
                }).join('') +
              '</select>' +
            '</div>' +
          '</div>' +
          '<div class="field">' +
            '<label>Replace Image (optional)</label>' +
            '<div id="pe-drop" class="drop-zone">' +
              '<p style="font-weight:600;color:#374151">Choose a new image</p>' +
              '<button type="button" class="btn btn-outline btn-sm" id="pe-btn">Choose Image</button>' +
              '<input type="file" id="pe-file" accept="image/jpeg,image/png,image/gif" style="display:none">' +
            '</div>' +
            '<p id="pe-file-name" style="margin-top:.4rem;font-size:.8rem;color:#166534"></p>' +
          '</div>' +
          '<div id="pe-err"></div>' +
          '<div class="flex justify-end" style="gap:.75rem;margin-top:1.25rem;padding-top:1.25rem;border-top:1px solid #e5e7eb">' +
            '<a href="portfolio.html" class="btn btn-outline">Cancel</a>' +
            '<button type="submit" class="btn btn-indigo" id="pe-submit">Save Changes</button>' +
          '</div>' +
        '</form>' +
      '</div>';

    let imageFile = null;
    const drop = document.getElementById('pe-drop');
    const input = document.getElementById('pe-file');
    document.getElementById('pe-btn').addEventListener('click', function () { input.click(); });
    input.addEventListener('change', function () { pick(input.files); });
    ['dragover', 'dragenter'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('dragging'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('dragging'); }); });
    drop.addEventListener('drop', function (e) {
      const files = e.dataTransfer && e.dataTransfer.files;
      if (files && files.length) pick(files);
    });

    function pick(files) {
      const f = files[0];
      if (!f) return;
      if (ALLOWED.indexOf(f.type) < 0) return setErr('Only PNG, JPG and GIF images are allowed');
      if (f.size > MAX) return setErr('"' + f.name + '" exceeds the 10MB limit');
      imageFile = f;
      setErr('');
      document.getElementById('pe-file-name').textContent = f.name + ' selected';
    }

    function setErr(msg) {
      document.getElementById('pe-err').innerHTML = msg ? '<div class="alert alert-red">' + CS.esc(msg) + '</div>' : '';
    }

    document.getElementById('pe-form').addEventListener('submit', function (e) {
      e.preventDefault();
      setErr('');
      const albumName = document.getElementById('pe-album').value;
      const description = document.getElementById('pe-desc').value.trim();
      const photographerName = document.getElementById('pe-photo').value;
      const category = document.getElementById('pe-cat').value;
      if (!albumName) return setErr('Please select an album');
      if (description.length < 10) return setErr('Description must be at least 10 characters');
      if (!photographerName) return setErr('Please select a photographer');
      if (!category) return setErr('Please select a category');

      const fd = new FormData();
      fd.append('albumName', albumName);
      fd.append('description', description);
      fd.append('photographerName', photographerName);
      fd.append('category', category);
      if (imageFile) fd.append('image', imageFile);

      const btn = document.getElementById('pe-submit');
      btn.disabled = true;
      btn.textContent = 'Saving...';
      CS.api.multipart('PUT', '/api/portfolio/' + encodeURIComponent(id), fd)
        .then(function () {
          CS.toast('Portfolio updated successfully', 'success');
          window.location.href = 'portfolio.html';
        })
        .catch(function () {
          btn.disabled = false;
          btn.textContent = 'Save Changes';
          setErr('Failed to update portfolio. Please try again.');
        });
    });
  }

  function load() {
    if (String(CS.session.role || '').toUpperCase() !== 'ADMIN') {
      window.location.href = 'login.html';
      return;
    }
    CS.renderAdminShell('admin-shell');
    if (!id) { window.location.href = 'portfolio.html'; return; }
    Promise.all([
      CS.api.get('/api/portfolio/' + encodeURIComponent(id)).catch(function () { return null; }),
      CS.api.get('/api/albums').catch(function () { return []; }),
      CS.api.get('/api/staff').catch(function () { return []; })
    ]).then(function (res) {
      if (!res[0]) {
        document.getElementById('pe-mount').innerHTML = '<div class="alert alert-red">Failed to load portfolio details</div>';
        return;
      }
      render(res[0], res[1] || [], res[2] || []);
    });
  }

  window.addEventListener('DOMContentLoaded', load);
})();