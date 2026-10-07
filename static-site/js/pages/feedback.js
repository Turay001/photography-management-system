/* ================================================================== */
/*  Critical Shot — feedback management (public list)                 */
/*  GET /api/feedbacks/active, PUT/DELETE for own feedback            */
/* ================================================================== */
(function () {
  'use strict';
  const CS = window.CS;

  const state = { list: [], packages: [], filter: '', loading: false };
  const email = CS.session.email || '';

  function stars(r) {
    r = Number(r) || 0;
    return '<span style="color:#f59e0b;letter-spacing:.1em">' + '★'.repeat(r) + '☆'.repeat(Math.max(0, 5 - r)) + '</span>';
  }

  function autoReply(r) {
    r = Number(r) || 0;
    if (r >= 4) return 'Thank you for your positive feedback! We\'re glad you had a great experience with our services.';
    if (r === 3) return 'Thank you for your feedback. We will strive to improve our services to serve you better.';
    return 'We\'re sorry to hear about your experience. We value your feedback and will work to improve.';
  }

  function card(f) {
    const mine = f.clientEmail && email && String(f.clientEmail).toLowerCase() === String(email).toLowerCase();
    return '<div class="card" style="padding:1.5rem 1.75rem;margin-bottom:1rem" data-fid="' + CS.esc(f.id) + '">' +
      '<div class="flex align-center justify-between" style="flex-wrap:wrap;gap:.5rem">' +
        '<div class="flex align-center" style="gap:.9rem;flex-wrap:wrap">' +
          '<span style="display:inline-flex;height:2.6rem;width:2.6rem;border-radius:9999px;align-items:center;justify-content:center;background:#e0e7ff;color:#3730a3;font-weight:700">' + CS.esc((f.clientName || '?').charAt(0).toUpperCase()) + '</span>' +
          '<div><h3 style="font-size:1rem;font-weight:700;color:#111827;margin:0">' + CS.esc(f.clientName || 'Customer') + '</h3>' +
          '<p style="font-size:.8rem;color:#6b7280;margin:.1rem 0 0">' + CS.esc(f.clientEmail || '') + '</p></div>' +
        '</div>' +
        (mine ? '<div style="display:flex;gap:.4rem">' +
          '<button class="btn btn-outline btn-sm" data-act="edit">Edit</button>' +
          '<button class="btn btn-danger-light btn-sm" data-act="delete">Delete</button>' +
        '</div>' : '') +
      '</div>' +
      '<div class="flex align-center" style="gap:.6rem;margin:.9rem 0 .5rem;flex-wrap:wrap">' +
        '<span class="badge badge-purple">Package: ' + CS.esc(f.packageName || '-') + '</span>' +
        stars(f.rating) +
      '</div>' +
      '<p style="font-size:.92rem;color:#374151;line-height:1.6;margin:0 0 .9rem">' + CS.esc(f.content || '') + '</p>' +
      '<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:.5rem;padding:.75rem 1rem;font-size:.85rem;color:#4b5563">' +
        '<strong style="color:#111827">Reply:</strong> ' + CS.esc(f.reply || autoReply(f.rating)) +
      '</div>' +
      '<p style="font-size:.78rem;color:#9ca3af;margin:.75rem 0 0">Created: ' + CS.fmtDateTime(f.createdAt) +
        (f.updatedAt && String(f.createdAt) !== String(f.updatedAt) ? ' &middot; Updated: ' + CS.fmtDateTime(f.updatedAt) : '') +
      '</p>' +
    '</div>';
  }

  function render() {
    const mount = document.getElementById('fb-mount');
    if (state.loading && !state.list.length) {
      mount.innerHTML = '<div class="loading-block"><span class="spinner spinner-dark"></span> Loading feedback...</div>';
      return;
    }
    const url = state.filter
      ? '/api/feedbacks/active?packageName=' + encodeURIComponent(state.filter)
      : '/api/feedbacks/active';
    CS.api.get(url)
      .then(function (data) { state.list = Array.isArray(data) ? data : []; })
      .catch(function () { state.list = []; CS.toast('Failed to load feedback', 'error'); })
      .finally(function () {
        if (!state.list.length) {
          mount.innerHTML = '<div class="card" style="padding:3rem;text-align:center;color:#6b7280">No feedbacks yet.</div>';
          return;
        }
        mount.innerHTML = state.list.map(card).join('');
        bindButtons(mount);
      });
  }

  function bindButtons(mount) {
    mount.querySelectorAll('[data-act="edit"]').forEach(function (btn) {
      btn.addEventListener('click', function () { editDialog(btn.closest('.card')); });
    });
    mount.querySelectorAll('[data-act="delete"]').forEach(function (btn) {
      btn.addEventListener('click', function () { del(btn.closest('.card')); });
    });
  }

  function editDialog(cardEl) {
    const f = state.list.find(function (x) { return String(x.id) === cardEl.dataset.fid; });
    if (!f || !email) return;
    const backdrop = document.createElement('div');
    backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:60;padding:1rem';
    backdrop.innerHTML =
      '<div style="background:#fff;border-radius:1rem;padding:1.75rem;max-width:30rem;width:100%;box-shadow:0 20px 50px rgba(0,0,0,.3)">' +
        '<h3 style="font-size:1.05rem;font-weight:700;color:#111827;margin:0 0 1rem">Edit Feedback</h3>' +
        '<div class="field"><label>Package</label>' +
          '<select id="fe-pkg" class="input-lite">' + state.packages.map(function (p) {
            return '<option value="' + CS.esc(p.name) + '"' + (f.packageName === p.name ? ' selected' : '') + '>' + CS.esc(p.name) + '</option>';
          }).join('') + '</select></div>' +
        '<div class="field"><label>Rating: <span id="fe-rate-val">' + (Number(f.rating) || 5) + ' ★</span></label>' +
          '<input type="range" id="fe-rate" min="1" max="5" step="1" value="' + (Number(f.rating) || 5) + '" style="width:100%">' +
          '<div style="display:flex;justify-content:space-between;font-size:.72rem;color:#6b7280"><span>1 ★</span><span>2</span><span>3</span><span>4</span><span>5 ★</span></div>' +
        '</div>' +
        '<div class="field"><label>Feedback Content <span class="req">*</span></label>' +
          '<textarea id="fe-content" class="input-lite" style="min-height:6rem" maxlength="500">' + CS.esc(f.content || '') + '</textarea></div>' +
        '<div id="fe-err"></div>' +
        '<div class="flex justify-end" style="gap:.5rem;margin-top:1rem">' +
          '<button class="btn btn-outline" id="fe-cancel">Cancel</button>' +
          '<button class="btn btn-indigo" id="fe-save">Save Changes</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(backdrop);
    document.getElementById('fe-rate').addEventListener('input', function (e) {
      document.getElementById('fe-rate-val').textContent = e.target.value + ' ★';
    });
    document.getElementById('fe-cancel').addEventListener('click', function () { backdrop.remove(); });
    document.getElementById('fe-save').addEventListener('click', function () {
      const content = document.getElementById('fe-content').value.trim();
      const rating = Number(document.getElementById('fe-rate').value);
      const packageName = document.getElementById('fe-pkg').value;
      const err = document.getElementById('fe-err');
      if (!content) { err.innerHTML = '<div class="alert alert-red">Feedback content is required.</div>'; return; }
      const btn = document.getElementById('fe-save');
      btn.disabled = true;
      btn.textContent = 'Saving...';
      CS.api.put('/api/feedbacks/' + encodeURIComponent(f.id), {
        content: content, rating: rating, packageName: packageName, clientEmail: email
      }).then(function () {
        backdrop.remove();
        CS.toast('Feedback updated successfully', 'success');
        render();
      }).catch(function () {
        btn.disabled = false;
        btn.textContent = 'Save Changes';
        err.innerHTML = '<div class="alert alert-red">Failed to update feedback.</div>';
      });
    });
  }

  function del(cardEl) {
    const f = state.list.find(function (x) { return String(x.id) === cardEl.dataset.fid; });
    if (!f) return;
    CS.confirm('Are you sure you want to delete this feedback?', 'Delete Feedback')
      .then(function (ok) {
        if (!ok) return;
        CS.api.del('/api/feedbacks/' + encodeURIComponent(f.id))
          .then(function () {
            CS.toast('Feedback deleted', 'success');
            render();
          })
          .catch(function () { CS.toast('Failed to delete feedback', 'error'); });
      });
  }

  function load() {
    document.getElementById('fb-filter').addEventListener('change', function (e) { state.filter = e.target.value; render(); });
    document.getElementById('fb-add').addEventListener('click', function () {
      if (!CS.session.isLoggedIn()) { window.location.href = 'login.html'; return; }
      const uid = CS.session.userId;
      CS.api.get('/api/bookings/client', { headers: { 'Userid': uid } })
        .then(function (data) {
          const bookings = Array.isArray(data) ? data : [];
          if (!bookings.length) {
            CS.toast('You must book a session before you can leave feedback. Please make a booking first.', 'error', 6000);
            return;
          }
          window.location.href = 'feedback-create.html';
        })
        .catch(function () {
          CS.toast('Could not verify your bookings. Please try again.', 'error');
        });
    });

    const pk = CS.api.get('/api/packages').catch(function () { return []; });
    state.loading = true;
    render();
    pk.then(function (data) {
      state.packages = Array.isArray(data) ? data : [];
      document.getElementById('fb-filter').innerHTML = '<option value="">All Packages</option>' +
        state.packages.map(function (p) { return '<option value="' + CS.esc(p.name) + '">' + CS.esc(p.name) + '</option>'; }).join('');
    }).finally(function () { state.loading = false; render(); });
  }

  window.addEventListener('DOMContentLoaded', load);
})();