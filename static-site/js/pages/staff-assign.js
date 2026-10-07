/* ================================================================== */
/*  Critical Shot — assign staff to a booking (admin)                 */
/*  GET /api/staff/:id, GET /admin/bookings, then two PUTs            */
/* ================================================================== */
(function () {
  'use strict';
  const CS = window.CS;

  const id = CS.qs('id');
  let staff = null;
  let bookings = [];

  function inRange(b) {
    const dt = new Date(b.dateTime);
    if (isNaN(dt)) return false;
    const from = staff.availabilityStartDate ? new Date(String(staff.availabilityStartDate).split('T')[0]) : null;
    const to = staff.availabilityEndDate ? new Date(String(staff.availabilityEndDate).split('T')[0]) : null;
    if (from && !isNaN(from) && dt < from) return false;
    if (to && !isNaN(to) && dt > to) return false;
    return true;
  }

  function render() {
    document.getElementById('sa-title').textContent = 'Assign ' + (staff.name || 'Staff') + ' to a Booking';
    const available = bookings.filter(inRange);
    const mount = document.getElementById('sa-mount');

    if (!available.length) {
      showModal();
      return;
    }

    mount.innerHTML = '<div class="card" style="overflow:auto;padding:0">' +
      '<table style="width:100%;border-collapse:collapse;font-size:.85rem;min-width:640px">' +
        '<thead><tr style="color:#6b7280;font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #e5e7eb;background:#f9fafb">' +
          '<th style="text-align:left;padding:.8rem .9rem">Date &amp; Time</th>' +
          '<th style="text-align:left;padding:.8rem .9rem">Client</th>' +
          '<th style="text-align:left;padding:.8rem .9rem">Package</th>' +
          '<th style="text-align:left;padding:.8rem .9rem">Location</th>' +
          '<th style="text-align:left;padding:.8rem .9rem">Status</th>' +
          '<th style="text-align:right;padding:.8rem .9rem">Actions</th>' +
        '</tr></thead><tbody>' +
        available.map(function (b) {
          const disabled = String(b.bookingStatus).toLowerCase() === 'cancelled';
          return '<tr style="border-bottom:1px solid #f3f4f6">' +
            '<td style="padding:.7rem .9rem;color:#111827;font-weight:600">' + CS.esc(CS.fmtDateTime(b.dateTime)) + '</td>' +
            '<td style="padding:.7rem .9rem;color:#4b5563">' + CS.esc(b.clientName || b.email || '-') + '</td>' +
            '<td style="padding:.7rem .9rem;color:#4b5563">' + CS.esc(b.packageName || '-') + '</td>' +
            '<td style="padding:.7rem .9rem;color:#4b5563">' + CS.esc(b.location || '-') + '</td>' +
            '<td style="padding:.7rem .9rem">' + CS.statusBadge(b.bookingStatus) + '</td>' +
            '<td style="padding:.7rem .9rem;text-align:right">' +
              '<button class="btn btn-sm btn-green" data-act="assign" data-bid="' + CS.esc(b.id) + '"' + (disabled ? ' disabled style="opacity:.5;cursor:not-allowed;background:#d1d5db;color:#6b7280"' : '') + '>Assign</button>' +
            '</td>' +
          '</tr>';
        }).join('') +
      '</tbody></table></div>';

    mount.querySelectorAll('[data-act="assign"]').forEach(function (btn) {
      btn.addEventListener('click', function () { doAssign(btn, btn.dataset.bid); });
    });
  }

  function doAssign(btn, bookingId) {
    btn.disabled = true;
    btn.textContent = 'Assigning...';
    Promise.all([
      CS.api.put('/api/staff/assign/' + encodeURIComponent(id), { bookingId: bookingId }),
      CS.api.put('/api/bookings/' + encodeURIComponent(bookingId) + '/assign', { staffId: id })
    ]).then(function () {
      CS.toast('Staff assigned successfully!', 'success');
      window.location.href = 'staff.html';
    }).catch(function () {
      btn.disabled = false;
      btn.textContent = 'Assign';
      CS.toast('Failed to assign staff', 'error');
    });
  }

  function showModal() {
    const wrap = document.getElementById('sa-content');
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:60';
    modal.innerHTML = '<div style="background:#fff;border-radius:1rem;padding:2rem 2.5rem;max-width:24rem;width:90%;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,.3)">' +
      '<h3 style="font-size:1.15rem;font-weight:800;margin:0 0 .5rem">PhotoStudio</h3>' +
      '<p style="color:#4b5563;font-size:.9rem;margin:0 0 1.25rem">No bookings available on this date for this photographer.</p>' +
      '<button class="btn btn-indigo" id="sa-ok" style="width:100%">OK</button>' +
    '</div>';
    wrap.appendChild(modal);
    document.getElementById('sa-ok').addEventListener('click', function () {
      window.location.href = 'staff.html';
    });
  }

  function load() {
    if (String(CS.session.role || '').toUpperCase() !== 'ADMIN') {
      window.location.href = 'login.html';
      return;
    }
    CS.renderAdminShell('admin-shell');
    if (!id) { window.location.href = 'staff.html'; return; }
    CS.api.get('/api/staff/' + encodeURIComponent(id))
      .then(function (data) {
        staff = data;
        if (!staff || !staff.id) {
          document.getElementById('sa-mount').innerHTML = '<div class="alert alert-red">Staff not found</div>';
          return null;
        }
        return CS.api.get('/admin/bookings');
      })
      .then(function (data) {
        bookings = Array.isArray(data) ? data : [];
        render();
      })
      .catch(function () {
        document.getElementById('sa-mount').innerHTML = '<div class="alert alert-red">Failed to load bookings</div>';
      });
  }

  window.addEventListener('DOMContentLoaded', load);
})();