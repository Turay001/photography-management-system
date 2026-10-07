/* ================================================================== */
/*  Critical Shot — standalone assistant page                       */
/*  Mounts the CS.Assistant chat widget inline on a dark page          */
/* ================================================================== */
(function () {
  'use strict';
  const CS = window.CS;

  window.addEventListener('DOMContentLoaded', function () {
    if (typeof CS.Assistant !== 'function') {
      CS.toast('Assistant failed to load', 'error');
      return;
    }
    new CS.Assistant(document.getElementById('ai-mount'));
  });
})();