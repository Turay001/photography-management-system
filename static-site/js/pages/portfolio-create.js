/* ================================================================== */
/*  Critical Shot — create portfolio (admin)                          */
/*  GET /api/albums, GET /api/staff, POST /api/portfolio (multipart)  */
/* ================================================================== */
(function () {
  'use strict';
  const CS = window.CS;

  const ALLOWED = ['image/jpeg', 'image/png', 'image/gif'];
  const MAX = 10 * 1024 * 1024;

  function render(albums, staff) {
    const mount = document.getElementById('pc-mount');
    mount.innerHTML =
      '<div class="card" style="padding:1.5rem 1.75rem 2rem">' +
        '<form id="pt-form" novalidate>' +
          '<div class="field">' +
            '<label for="pt-album">Album Name <span class="req">*</span></label>' +
            '<select id="pt-album" class="input-lite"><option value="">Select an album</option>' +
              albums.map(function (a) { return '<option value="' + CS.esc(a.name) + '">' + CS.esc(a.name) + '</option>'; }).join('') +
            '</select>' +
          '</div>' +
          '<div class="field">' +
            '<label for="pt-desc">Description <span class="req">*</span></label>' +
            '<textarea id="pt-desc" class="input-lite" rows="4" placeholder="Describe this work..."></textarea>' +
          '</div>' +
          '<div class="form-2col">' +
            '<div class="field">' +
              '<label for="pt-photo">Photographer <span class="req">*</span></label>' +
              '<select id="pt-photo" class="input-lite"><option value="">Select a photographer</option>' +
                staff.map(function (s) { return '<option value="' + CS.esc(s.name) + '">' + CS.esc(s.name) + '</option>'; }).join('') +
              '</select>' +
            '</div>' +
            '<div class="field">' +
              '<label for="pt-cat">Category <span class="req">*</span></label>' +
              '<select id="pt-cat" class="input-lite">' +
                '<option value="">Select a category</option>' +
                '<option value="portrait">Portrait</option>' +
                '<option value="wedding">Wedding</option>' +
                '<option value="commercial">Commercial</option>' +
                '<option value="sports">Sports</option>' +
              '</select>' +
            '</div>' +
          '</div>' +
          '<div class="field">' +
            '<label>Image <span class="req">*</span></label>' +
            '<div id="pt-drop" class="drop-zone">' +
              '<p style="font-weight:600;color:#374151">Drag &amp; drop your image here</p>' +
              '<p style="font-size:.8rem;color:#6b7280">PNG, JPG, GIF up to 10MB</p>' +
              '<button type="button" class="btn btn-outline btn-sm" id="pt-btn">Choose Image</button>' +
              '<input type="file" id="pt-file" accept="image/jpeg,image/png,image/gif" style="display:none">' +
            '</div>' +
            '<p id="pt-file-name" style="margin-top:.4rem;font-size:.8rem;color:#166534"></p>' +
          '</div>' +
          '<div id="pt-err"></div>' +
          '<div class="flex justify-end" style="gap:.75rem;margin-top:1.25rem;padding-top:1.25rem;border-top:1px solid #e5e7eb">' +
            '<a href="portfolio.html" class="btn btn-outline">Cancel</a>' +
            '<button type="submit" class="btn btn-indigo" id="pt-submit">Create Portfolio</button>' +
          '</div>' +
        '</form>' +
      '</div>';

    let imageFile = null;
    const drop = document.getElementById('pt-drop');
    const input = document.getElementById('pt-file');
    document.getElementById('pt-btn').addEventListener('click', function () { input.click(); });
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
      document.getElementById('pt-file-name').textContent = f.name + ' selected';
    }

    function setErr(msg) {
      document.getElementById('pt-err').innerHTML = msg ? '<div class="alert alert-red">' + CS.esc(msg) + '</div>' : '';
    }

    document.getElementById('pt-form').addEventListener('submit', function (e) {
      e.preventDefault();
      setErr('');
      const albumName = document.getElementById('pt-album').value;
      const description = document.getElementById('pt-desc').value.trim();
      const photographerName = document.getElementById('pt-photo').value;
      const category = document.getElementById('pt-cat').value;
      if (!albumName) return setErr('Please select an album');
      if (description.length < 10) return setErr('Description must be at least 10 characters');
      if (!photographerName) return setErr('Please select a photographer');
      if (!category) return setErr('Please select a category');
      if (!imageFile) return setErr('Please choose an image');

      const fd = new FormData();
      fd.append('albumName', albumName);
      fd.append('description', description);
      fd.append('photographerName', photographerName);
      fd.append('category', category);
      fd.append('image', imageFile);

      const btn = document.getElementById('pt-submit');
      btn.disabled = true;
      btn.textContent = 'Creating...';
      CS.api.multipart('POST', '/api/portfolio', fd)
        .then(function () {
          CS.toast('Portfolio created successfully', 'success');
          window.location.href = 'portfolio.html';
        })
        .catch(function () {
          btn.disabled = false;
          btn.textContent = 'Create Portfolio';
          setErr('Failed to create portfolio. Please try again.');
        });
    });
  }

  function load() {
    if (String(CS.session.role || '').toUpperCase() !== 'ADMIN') {
      window.location.href = 'login.html';
      return;
    }
    CS.renderAdminShell('admin-shell');
    Promise.all([
      CS.api.get('/api/albums').catch(function () { return []; }),
      CS.api.get('/api/staff').catch(function () { return []; })
    ]).then(function (res) {
      render(res[0] || [], res[1] || []);
    });
  }

  window.addEventListener('DOMContentLoaded', load);
})();