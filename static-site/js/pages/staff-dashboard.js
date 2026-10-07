/* ================================================================== */
/*  Critical Shot — staff dashboard (staff only)                      */
/*  GET /api/staff/search?email=..., GET /api/bookings/staff/{id}     */
/* ================================================================== */
(function () {
  'use strict';
  const CS = window.CS;

  const state = { staff: null, bookings: [], loading: false, error: '' };

  function card(b) {
    const longDate = CS.fmtLong(b.dateTime);
    return '<div class="card" style="padding:1.4rem 1.6rem;margin-bottom:1rem">' +
      '<div class="flex align-center justify-between" style="gap:1rem;flex-wrap:wrap">' +
        '<div style="display:grid;gap:.6rem;flex:1;min-width:220px">' +
          '<div class="flex align-center" style="gap:.6rem">' + CS.icon('person', 'h-4 w-4') + '<span style="color:#111827;font-weight:600">' + CS.esc(b.clientName || b.email || 'Client') + '</span></div>' +
          '<div class="flex align-center" style="gap:.6rem">' + CS.icon('clock', 'h-4 w-4') + '<span style="color:#4b5563">' + CS.esc(longDate) + '</span></div>' +
          '<div class="flex align-center" style="gap:.6rem">' + CS.icon('pin', 'h-4 w-4') + '<span style="color:#4b5563">' + CS.esc(b.location || '-') + '</span></div>' +
          '<div class="flex align-center" style="gap:.6rem">' + CS.icon('package', 'h-4 w-4') + '<span style="color:#4b5563">' + CS.esc(b.packageName || '-') + '</span></div>' +
        '</div>' +
        '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:.6rem">' +
          CS.statusBadge(b.bookingStatus) +
          '<button class="btn btn-indigo btn-sm" data-sd-pdf="' + CS.esc(b.id) + '">' + CS.icon('download', 'h-4 w-4') + ' Download PDF</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function render() {
    const mount = document.getElementById('sd-mount');
    if (state.error) {
      mount.innerHTML = '<div class="card" style="padding:2.5rem;text-align:center;color:#6b7280">' + CS.esc(state.error) +
        '<div style="margin-top:1rem"><button class="btn btn-indigo" onclick="location.reload()">Try Again</button></div></div>';
      return;
    }
    if (state.loading && !state.bookings.length) {
      mount.innerHTML = '<div class="loading-block"><span class="spinner spinner-dark"></span> Loading assignments...</div>';
      return;
    }
    if (!state.bookings.length) {
      mount.innerHTML = '<div class="card" style="padding:3rem;text-align:center;color:#6b7280">' +
        CS.icon('calendar', 'h-10 w-10') + '<p style="font-weight:600;margin:.75rem 0 .25rem;color:#374151">No assignments</p>' +
        '<p style="margin:0">You don\'t have any upcoming photo shoots.</p></div>';
      return;
    }
    mount.innerHTML = state.bookings.map(card).join('');
    mount.querySelectorAll('[data-sd-pdf]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const b = state.bookings.find(function (x) { return String(x.id) === btn.dataset.sdPdf; });
        if (b) downloadPdf(b, btn);
      });
    });
  }

  function downloadPdf(b, btn) {
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.textContent = 'Preparing PDF...';
    setTimeout(function () {
      try {
        const pdf = CS.pdf.create('assignment-' + b.id + '.pdf');
        const x = 55;
        let y = 120;
        pdf.text('Assignment Details', x, y, { size: 26, bold: true, color: [79, 70, 229] });
        y += 20;
        pdf.text('Photography Management System', x, y, { size: 14, color: [124, 58, 237] });
        y += 14;
        pdf.line(x, y, pdf.width - 55, y, 1, [79, 70, 229]);
        y += 40;
        const rows = [
          ['Client Name', b.clientName || b.email || '-'],
          ['Date & Time', CS.fmtLong(b.dateTime)],
          ['Location', b.location || '-'],
          ['Package', b.packageName || '-']
        ];
        rows.forEach(function (r) {
          pdf.text(r[0], x, y, { size: 12, bold: true, color: [55, 65, 81] });
          pdf.text(String(r[1] || ''), x + 160, y, { size: 12, color: [17, 24, 39] });
          y += 30;
        });
        y += 12;
        pdf.rect(x, y, 210, 30, [238, 242, 255]);
        pdf.text('Status: ' + String(b.bookingStatus || '').toUpperCase(), x + 16, y + 20, { size: 12, bold: true, color: [79, 70, 229] });
        y += 60;
        pdf.text('Generated on ' + new Date().toLocaleDateString(), x, y, { size: 10, color: [107, 114, 128] });
        pdf.save();
      } catch (e) {
        CS.toast('Failed to generate PDF', 'error');
      }
      btn.disabled = false;
      btn.innerHTML = orig;
    }, 50);
  }

  function load() {
    if (!CS.session.isLoggedIn()) { window.location.href = 'login.html'; return; }
    if (String(CS.session.role || '').toUpperCase() !== 'STAFF') { window.location.href = 'index.html'; return; }

    document.getElementById('sd-avatar-circle').innerHTML = CS.icon('person', 'h-6 w-6');
    document.getElementById('sd-logout').addEventListener('click', function () {
      CS.session.clear();
      window.location.href = 'login.html';
    });

    const email = CS.session.email || '';
    document.getElementById('sd-email').textContent = email;

    state.loading = true;
    render();
    CS.api.get('/api/staff/search?email=' + encodeURIComponent(email))
      .then(function (data) {
        if (!data || !data.id) { state.error = 'Staff not found'; return '';
        }
        state.staff = data;
        document.getElementById('sd-name').textContent = data.name;
        document.getElementById('sd-avatar').href = 'staff-profile.html?id=' + encodeURIComponent(data.id);
        return CS.api.get('/api/bookings/staff/' + encodeURIComponent(data.id));
      })
      .then(function (data) {
        if (data && Array.isArray(data)) {
          state.bookings = data.slice().sort(function (a, b) { return new Date(b.dateTime) - new Date(a.dateTime); });
        }
      })
      .catch(function () { state.error = 'Failed to load staff information'; })
      .finally(function () { state.loading = false; render(); });
  }

  window.addEventListener('DOMContentLoaded', load);
})();