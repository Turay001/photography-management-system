/* ================================================================== */
/*  Critical Shot — create package (admin)                            */
/*  POST /api/packages (rendered by js/packages-form.js)              */
/* ================================================================== */
(function () {
  'use strict';
  const CS = window.CS;

  function load() {
    if (String(CS.session.role || '').toUpperCase() !== 'ADMIN') {
      window.location.href = 'login.html';
      return;
    }
    CS.renderAdminShell('admin-shell');
    CS.renderPackageForm(document.getElementById('pkg-mount'), null, 'create', null);
  }

  window.addEventListener('DOMContentLoaded', load);
})();