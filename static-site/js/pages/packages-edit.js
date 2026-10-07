/* ================================================================== */
/*  Critical Shot — edit package (admin)                              */
/*  GET /api/packages/:id, PUT /api/packages/:id                      */
/* ================================================================== */
(function () {
  'use strict';
  const CS = window.CS;

  const id = CS.qs('id');

  function load() {
    if (String(CS.session.role || '').toUpperCase() !== 'ADMIN') {
      window.location.href = 'login.html';
      return;
    }
    CS.renderAdminShell('admin-shell');
    if (!id) { window.location.href = 'packages-admin.html'; return; }
    CS.api.get('/api/packages/' + encodeURIComponent(id))
      .then(function (data) {
        if (!data) { document.getElementById('pkg-mount').innerHTML = '<div class="alert alert-red">Package not found</div>'; return; }
        CS.renderPackageForm(document.getElementById('pkg-mount'), data, 'edit', id);
      })
      .catch(function () {
        document.getElementById('pkg-mount').innerHTML = '<div class="alert alert-red">Failed to load package details</div>';
      });
  }

  window.addEventListener('DOMContentLoaded', load);
})();