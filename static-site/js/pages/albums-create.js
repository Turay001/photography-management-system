/* ================================================================== */
/*  Critical Shot — create album (admin)                              */
/*  POST /api/albums (multipart/form-data)                            */
/* ================================================================== */
(function () {
  'use strict';
  const CS = window.CS;

  const ALLOWED = ['image/jpeg', 'image/png', 'image/gif'];
  const MAX = 10 * 1024 * 1024;

  function bindDrag(dropId, inputId, onPick) {
    const drop = document.getElementById(dropId);
    const input = document.getElementById(inputId);
    document.getElementById(dropId + '-btn').addEventListener('click', function () { input.click(); });
    input.addEventListener('change', function () { onPick(input.files); });
    ['dragover', 'dragenter'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('dragging'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('dragging'); });
    });
    drop.addEventListener('drop', function (e) {
      const files = e.dataTransfer && e.dataTransfer.files;
      if (!files || !files.length) return;
      onPick(files);
    });
  }

  function validate(files) {
    for (const f of files) {
      if (ALLOWED.indexOf(f.type) < 0) return 'Only PNG, JPG and GIF images are allowed';
      if (f.size > MAX) return '"' + f.name + '" exceeds the 10MB limit';
    }
    return null;
  }

  function setErr(msg) {
    document.getElementById('a-err').innerHTML = msg ? '<div class="alert alert-red">' + CS.esc(msg) + '</div>' : '';
  }

  function load() {
    if (String(CS.session.role || '').toUpperCase() !== 'ADMIN') {
      window.location.href = 'login.html';
      return;
    }
    CS.renderAdminShell('admin-shell');

    let imageFiles = null;
    let coverFile = null;

    bindDrag('a-images-drop', 'a-images', function (files) {
      const bad = validate(files);
      if (bad) { setErr(bad); return; }
      imageFiles = files;
      document.getElementById('a-images-count').textContent = imageFiles.length + ' file(s) selected';
    });
    bindDrag('a-cover-drop', 'a-cover', function (files) {
      const bad = validate(files);
      if (bad) { setErr(bad); return; }
      coverFile = files[0];
      document.getElementById('a-cover-name').textContent = coverFile.name + ' selected';
    });

    document.getElementById('album-form').addEventListener('submit', function (e) {
      e.preventDefault();
      setErr('');
      const name = document.getElementById('a-name').value.trim();
      const description = document.getElementById('a-desc').value.trim();
      const category = document.getElementById('a-cat').value;
      const location = document.getElementById('a-loc').value.trim();
      const status = document.getElementById('a-status').value;

      if (name.length < 3) return setErr('Album name must be at least 3 characters');
      if (description.length < 10) return setErr('Description must be at least 10 characters');
      if (!category) return setErr('Please select a category');
      if (!location) return setErr('Please provide a location');
      if (!imageFiles || !imageFiles.length) return setErr('Please select at least one image');
      if (!coverFile) return setErr('Please select a cover image');

      const fd = new FormData();
      fd.append('name', name);
      fd.append('description', description);
      fd.append('category', category);
      fd.append('location', location);
      fd.append('status', status);
      Array.prototype.forEach.call(imageFiles, function (f) { fd.append('images', f); });
      fd.append('coverImage', coverFile);

      const btn = document.getElementById('a-submit');
      btn.disabled = true;
      btn.textContent = 'Creating...';
      CS.api.multipart('POST', '/api/albums', fd)
        .then(function () {
          CS.toast('Album created successfully', 'success');
          window.location.href = 'albums.html';
        })
        .catch(function () {
          btn.disabled = false;
          btn.textContent = 'Create Album';
          setErr('Failed to create album. Please try again.');
        });
    });
  }

  window.addEventListener('DOMContentLoaded', load);
})();