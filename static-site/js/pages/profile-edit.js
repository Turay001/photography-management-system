/* ================================================================== */
/*  Critical Shot — edit profile (customer)                           */
/*  GET + PUT /api/auth/profile/{userId} (session cookie)             */
/* ================================================================== */
(function () {
  'use strict';
  const CS = window.CS;

  const uid = CS.session.userId;

  function render() {
    CS.api.get('/api/auth/profile/' + encodeURIComponent(uid), { credentials: 'include' })
      .then(function (user) {
        if (!user) { fail('Profile not found.'); return; }
        const mount = document.getElementById('pe-mount');
        mount.innerHTML =
          '<div class="card" style="padding:1.75rem">' +
            '<form id="pe-form" novalidate>' +
              '<div class="field"><label>Name <span class="req">*</span></label>' +
                '<input type="text" id="pe-name" class="input-lite" value="' + CS.esc(user.name || '') + '" required></div>' +
              '<div class="field"><label>Email <span class="req">*</span></label>' +
                '<input type="email" id="pe-email" class="input-lite" value="' + CS.esc(user.email || '') + '" required></div>' +
              '<div class="field"><label>Contact Number</label>' +
                '<input type="tel" id="pe-phone" class="input-lite" value="' + CS.esc(user.contactNumber || '') + '"></div>' +
              '<div id="pe-err"></div>' +
              '<div class="flex justify-end" style="gap:.75rem;margin-top:1.25rem;padding-top:1.25rem;border-top:1px solid #e5e7eb">' +
                '<a href="profile.html" class="btn btn-outline">Cancel</a>' +
                '<button type="submit" class="btn btn-indigo" id="pe-save">Save Changes</button>' +
              '</div>' +
            '</form>' +
          '</div>';
        mount.querySelector('#pe-form').addEventListener('submit', function (e) {
          e.preventDefault();
          setErr('');
          const name = document.getElementById('pe-name').value.trim();
          const email = document.getElementById('pe-email').value.trim();
          const contactNumber = document.getElementById('pe-phone').value.trim();
          if (!name) return setErr('Name is required.');
          if (!/^\S+@\S+\.\S+$/.test(email)) return setErr('Please enter a valid email address.');
          const btn = document.getElementById('pe-save');
          btn.disabled = true;
          btn.textContent = 'Saving...';
          CS.api.put('/api/auth/profile/' + encodeURIComponent(uid), {
            name: name, email: email, contactNumber: contactNumber, role: user.role || ''
          }, null, { credentials: 'include' })
            .then(function () {
              CS.toast('Profile updated successfully!', 'success');
              setTimeout(function () { window.location.href = 'profile.html'; }, 1000);
            })
            .catch(function (err) {
              btn.disabled = false;
              btn.textContent = 'Save Changes';
              const data = err && err.data;
              setErr(data && data.message ? data.message : 'Failed to update profile.');
            });
        });
      })
      .catch(function () { fail('Failed to load profile. Are you logged in?'); });

    function fail(msg) {
      document.getElementById('pe-mount').innerHTML = '<div class="alert alert-red">' + CS.esc(msg) + '</div>';
    }
  }

  function setErr(msg) {
    document.getElementById('pe-err').innerHTML = msg ? '<div class="alert alert-red">' + CS.esc(msg) + '</div>' : '';
  }

  function load() {
    if (!CS.session.isLoggedIn()) { window.location.href = 'login.html'; return; }
    render();
  }

  window.addEventListener('DOMContentLoaded', load);
})();