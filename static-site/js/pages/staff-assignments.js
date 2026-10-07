/* ================================================================== */
/*  Critical Shot — staff assignments list                            */
/*  GET /api/bookings/staff/{staffId}                                 */
/* ================================================================== */
(function () {
  'use strict';
  const CS = window.CS;

  const staffId = CS.qs('staffId');
  let bookings = [];

  function card(b) {
    return '<div class="card" style="padding:1.4rem 1.6rem;margin-bottom:1rem">' +
      '<div class="flex align-center justify-between" style="flex-wrap:wrap;gap:.5rem">' +
        '<h3 style="font-size:1.05rem;font-weight:700;color:#111827;margin:0">' + CS.esc(b.packageName || 'Package') + '</h3>' +
        '<div style="display:flex;gap:.5rem">' + CS.statusBadge(b.bookingStatus) + CS.statusBadge(b.paymentStatus) + '</div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:.6rem;margin-top:1rem;font-size:.88rem;color:#4b5563">' +
        '<div><span class="pg-label">Date</span><div class="pg-val">' + CS.esc(fmt('date', b.dateTime)) + '</div></div>' +
        '<div><span class="pg-label">Time</span><div class="pg-val">' + CS.esc(fmt('time', b.dateTime)) + '</div></div>' +
        '<div><span class="pg-label">Location</span><div class="pg-val">' + CS.esc(b.location || '-') + '</div></div>' +
        '<div><span class="pg-label">Package</span><div class="pg-val">' + CS.esc(b.packageName || '-') + '</div></div>' +
        '<div><span class="pg-label">Price</span><div class="pg-val">Le ' + Number(b.price || 0).toLocaleString() + '</div></div>' +
      '</div>' +
      '<hr style="border:0;border-top:1px solid #e5e7eb;margin:1rem 0">' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:.6rem;font-size:.88rem;color:#4b5563">' +
        '<div><span class="pg-label">Client ID</span><div class="pg-val">' + CS.esc(b.clientId || '-') + '</div></div>' +
        '<div><span class="pg-label">Phone</span><div class="pg-val">' + CS.esc(b.phoneNumber || '-') + '</div></div>' +
        '<div><span class="pg-label">Email</span><div class="pg-val">' + CS.esc(b.email || '-') + '</div></div>' +
      '</div>' +
      '<div style="margin-top:1rem"><a class="btn btn-indigo btn-sm" href="staff-assign.html?id=' + encodeURIComponent(b.id) + '">View Details</a></div>' +
    '</div>';
  }

  function fmt(kind, d) {
    const dt = new Date(d);
    if (isNaN(dt)) return String(d || '-');
    return kind === 'date' ? dt.toLocaleDateString() : dt.toLocaleTimeString();
  }

  function render() {
    const mount = document.getElementById('sag-mount');
    if (!bookings.length) {
      mount.innerHTML = '<div class="card" style="padding:3rem;text-align:center;color:#6b7280">' +
        '<p style="font-weight:600;margin:.75rem 0 .25rem;color:#374151">No assignments</p>' +
        '<p style="margin:0">You don\'t have any assignments at the moment.</p></div>';
      return;
    }
    mount.innerHTML = bookings.map(card).join('');
  }

  function load() {
    if (!CS.session.isLoggedIn()) { window.location.href = 'login.html'; return; }

    if (!staffId) {
      document.getElementById('sag-mount').innerHTML =
        '<div class="card" style="padding:2.5rem;text-align:center">' +
          '<p style="color:#374151;font-weight:600;margin:0 0 1rem">Staff ID not found</p>' +
          '<a href="staff-dashboard.html" class="btn btn-indigo">Back to Dashboard</a>' +
        '</div>';
      return;
    }

    CS.api.get('/api/bookings/staff/' + encodeURIComponent(staffId))
      .then(function (data) {
        bookings = Array.isArray(data) ? data.slice().sort(function (a, b) { return new Date(b.dateTime) - new Date(a.dateTime); }) : [];
      })
      .catch(function () { bookings = []; CS.toast('Failed to load assignments', 'error'); })
      .finally(render);
  }

  window.addEventListener('DOMContentLoaded', load);
})();