/* ================================================================== */
/*  Critical Shot — user profile (customer)                           */
/*  GET /api/auth/profile/{userId} (session cookie), favorites        */
/* ================================================================== */
(function () {
  'use strict';
  const CS = window.CS;

  const uid = CS.session.userId;
  const state = { user: null, favs: [], error: '' };

  function infoBox(label, value) {
    return '<div style="background:#f3f4f6;border-radius:.5rem;padding:.9rem 1.1rem">' +
      '<p style="font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:0 0 .2rem">' + CS.esc(label) + '</p>' +
      '<p style="font-size:.95rem;font-weight:600;color:#111827;margin:0">' + CS.esc(value) + '</p>' +
    '</div>';
  }

  function render() {
    const mount = document.getElementById('pu-mount');
    if (state.error) {
      mount.innerHTML = '<div class="card" style="padding:2.5rem;text-align:center;color:#dc2626">' + CS.esc(state.error) + '</div>';
      return;
    }
    if (!state.user) return;

    mount.innerHTML =
      '<div class="card" style="padding:1.75rem">' +
        '<h3 style="font-size:1rem;font-weight:700;color:#111827;margin:0 0 1rem">Profile Details</h3>' +
        '<div class="grid2">' +
          infoBox('Role', state.user.role || '') +
          infoBox('Name', state.user.name || '') +
          infoBox('Email', state.user.email || '') +
          infoBox('Contact Number', state.user.contactNumber || 'Not provided') +
        '</div>' +
        '<div style="margin-top:1.25rem;padding-top:1.25rem;border-top:1px solid #e5e7eb">' +
          '<a href="profile-edit.html" class="btn btn-indigo">Edit Profile</a>' +
        '</div>' +
      '</div>' +

      '<div style="margin-top:1.75rem">' +
        '<h3 style="font-size:1.05rem;font-weight:700;color:#111827;margin:0 0 1rem">Favorite Albums</h3>' +
        (state.favs.length
          ? '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:1rem">' +
              state.favs.map(function (a) {
                const img = (a.images && a.images[0]) ? a.images[0] : '';
                return '<a href="albums-view.html?id=' + encodeURIComponent(a.id) + '" style="text-decoration:none;display:block">' +
                  '<div style="border-radius:.6rem;overflow:hidden;border:1px solid #e5e7eb;background:#f3f4f6;aspect-ratio:4/3">' +
                    (img ? '<img src="' + CS.uploadUrl(img) + '" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block">' : '') +
                  '</div>' +
                  '<p style="font-size:.88rem;font-weight:600;color:#111827;margin:.5rem 0 0">' + CS.esc(a.name) + '</p>' +
                '</a>';
              }).join('') +
            '</div>'
          : '<div class="card" style="padding:2rem;text-align:center;color:#6b7280">No favorite albums yet</div>') +
      '</div>';

    document.getElementById('pu-logout').addEventListener('click', function () {
      CS.session.clear();
      window.location.href = 'login.html';
    });
  }

  function load() {
    if (!CS.session.isLoggedIn()) { window.location.href = 'login.html'; return; }

    const profileQ = CS.api.get('/api/auth/profile/' + encodeURIComponent(uid), { credentials: 'include' })
      .catch(function () { state.error = 'Failed to load profile. Are you logged in?'; return null; });
    const favsQ = CS.api.get('/api/users/' + encodeURIComponent(uid) + '/favorites')
      .catch(function () { return []; });

    profileQ.then(function (data) {
      state.user = data;
      return favsQ;
    }).then(function (data) {
      state.favs = Array.isArray(data) ? data : [];
    }).finally(function () { render(); });
  }

  window.addEventListener('DOMContentLoaded', load);
})();