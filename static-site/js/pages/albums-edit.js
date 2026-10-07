/* ================================================================== */
/*  Critical Shot — edit album (admin)                                */
/*  GET /api/albums/:id, PUT /api/albums/:id (multipart)              */
/* ================================================================== */
(function () {
  'use strict';
  const CS = window.CS;

  const id = CS.qs('id');
  const ALLOWED = ['image/jpeg', 'image/png', 'image/gif'];
  const MAX = 10 * 1024 * 1024;

  function setErr(msg) {
    document.getElementById('e-err').innerHTML = msg ? '<div class="alert alert-red">' + CS.esc(msg) + '</div>' : '';
  }

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

  function render(album) {
    document.getElementById('ae-title').textContent = 'Edit: ' + (album.name || 'Album');
    const mount = document.getElementById('ae-mount');
    const existing = (album.images || []).map(function (f) {
      return '<div style="width:64px;height:64px;border-radius:.5rem;overflow:hidden;border:1px solid #e5e7eb"><img src="' + CS.uploadUrl(f) + '" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block"></div>';
    }).join('');

    mount.innerHTML =
      '<div class="card" style="padding:1.5rem 1.75rem 2rem">' +
        '<div class="field">' +
          '<label>Current Cover</label>' +
          '<div style="width:11rem;aspect-ratio:4/3;border-radius:.6rem;overflow:hidden;border:1px solid #e5e7eb;background:#e7e5e4">' +
            (album.coverImage ? '<img src="' + CS.uploadUrl(album.coverImage) + '" alt="" style="width:100%;height:100%;object-fit:cover;display:block">' : '') +
          '</div>' +
        '</div>' +
        (existing ? '<div class="field"><label>Current Images</label><div style="display:flex;gap:.5rem;flex-wrap:wrap">' + existing + '</div></div>' : '') +
        '<form id="edit-form" novalidate>' +
          '<div class="field"><label for="e-name">Album Name</label><input type="text" id="e-name" class="input-lite" value="' + CS.esc(album.name || '') + '"></div>' +
          '<div class="field"><label for="e-desc">Description</label><textarea id="e-desc" class="input-lite" rows="4">' + CS.esc(album.description || '') + '</textarea></div>' +
          '<div class="form-2col">' +
            '<div class="field"><label for="e-cat">Category</label><select id="e-cat" class="input-lite">' +
              ['portrait', 'wedding', 'commercial', 'sports', 'other'].map(function (c) {
                return '<option value="' + c + '"' + (album.category === c ? ' selected' : '') + '>' + c.charAt(0).toUpperCase() + c.slice(1) + '</option>';
              }).join('') +
            '</select></div>' +
            '<div class="field"><label for="e-loc">Location</label><input type="text" id="e-loc" class="input-lite" value="' + CS.esc(album.location || '') + '"></div>' +
          '</div>' +
          '<div class="field"><label for="e-status">Status</label><select id="e-status" class="input-lite">' +
            '<option value="active"' + (album.status === 'active' ? ' selected' : '') + '>Active</option>' +
            '<option value="inactive"' + (album.status === 'inactive' ? ' selected' : '') + '>Inactive</option>' +
          '</select></div>' +
          '<div class="field"><label>Add More Images (optional)</label>' +
            '<div id="e-images-drop" class="drop-zone"><p style="font-weight:600;color:#374151">Add new photos</p>' +
            '<button type="button" class="btn btn-outline btn-sm" id="e-images-btn">Choose Files</button>' +
            '<input type="file" id="e-images" multiple accept="image/jpeg,image/png,image/gif" style="display:none"></div>' +
            '<p id="e-images-count" style="margin-top:.4rem;font-size:.8rem;color:#166534"></p>' +
          '</div>' +
          '<div class="field"><label>Replace Cover Image (optional)</label>' +
            '<div id="e-cover-drop" class="drop-zone"><p style="font-weight:600;color:#374151">Choose a new cover</p>' +
            '<button type="button" class="btn btn-outline btn-sm" id="e-cover-btn">Choose Cover</button>' +
            '<input type="file" id="e-cover" accept="image/jpeg,image/png,image/gif" style="display:none"></div>' +
            '<p id="e-cover-name" style="margin-top:.4rem;font-size:.8rem;color:#166534"></p>' +
          '</div>' +
          '<div id="e-err"></div>' +
          '<div class="flex justify-end" style="gap:.75rem;margin-top:1.25rem;padding-top:1.25rem;border-top:1px solid #e5e7eb">' +
            '<a href="albums.html" class="btn btn-outline">Cancel</a>' +
            '<button type="submit" class="btn btn-indigo" id="e-submit">Save Changes</button>' +
          '</div>' +
        '</form>' +
      '</div>';

    let imageFiles = null;
    let coverFile = null;

    bindDrag('e-images-drop', 'e-images', function (files) {
      imageFiles = files;
      document.getElementById('e-images-count').textContent = imageFiles.length + ' new file(s) selected';
    });
    bindDrag('e-cover-drop', 'e-cover', function (files) {
      coverFile = files[0];
      document.getElementById('e-cover-name').textContent = coverFile.name + ' selected';
    });

    document.getElementById('edit-form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      setErr('');
      const name = document.getElementById('e-name').value.trim();
      const description = document.getElementById('e-desc').value.trim();
      const category = document.getElementById('e-cat').value;
      const location = document.getElementById('e-loc').value.trim();
      const status = document.getElementById('e-status').value;
      if (name.length < 3) return setErr('Album name must be at least 3 characters');
      if (description.length < 10) return setErr('Description must be at least 10 characters');
      if (!category) return setErr('Please select a category');
      if (!location) return setErr('Please provide a location');

      const fd = new FormData();
      fd.append('name', name);
      fd.append('description', description);
      fd.append('category', category);
      fd.append('location', location);
      fd.append('status', status);
      if (imageFiles) Array.prototype.forEach.call(imageFiles, function (f) { fd.append('images', f); });
      if (coverFile) fd.append('coverImage', coverFile);

      const btn = document.getElementById('e-submit');
      btn.disabled = true;
      btn.textContent = 'Saving...';
      CS.api.multipart('PUT', '/api/albums/' + encodeURIComponent(id), fd)
        .then(function () {
          CS.toast('Album updated successfully', 'success');
          window.location.href = 'albums.html';
        })
        .catch(function () {
          btn.disabled = false;
          btn.textContent = 'Save Changes';
          setErr('Failed to update album. Please try again.');
        });
    });
  }

  function load() {
    if (String(CS.session.role || '').toUpperCase() !== 'ADMIN') {
      window.location.href = 'login.html';
      return;
    }
    CS.renderAdminShell('admin-shell');
    if (!id) { window.location.href = 'albums.html'; return; }
    CS.api.get('/api/albums/' + encodeURIComponent(id))
      .then(render)
      .catch(function () {
        document.getElementById('ae-mount').innerHTML = '<div class="alert alert-red">Failed to load album details</div>';
      });
  }

  window.addEventListener('DOMContentLoaded', load);
})();