/* ================================================================== */
/*  Critical Shot — client bookings list                              */
/*  GET /api/bookings/client (header userId)                          */
/*  Reschedule  PUT /api/bookings/reschedule/:id  {dateTime}          */
/*  Cancel      PATCH /api/bookings/cancel/:id                        */
/*  PDF reports via CS.pdf (client-side)                             */
/* ================================================================== */
(function () {
  'use strict';
  const CS = window.CS;

  let bookings = [];
  let bookingConfig = null;

  const INDIGO = [79, 70, 229];
  const SLATE = [100, 116, 139];
  const DARK = [51, 65, 85];
  const GREEN = [22, 163, 74];
  const RED = [220, 38, 38];
  const BLUE = [29, 78, 216];

  /* ------------------------------ UI ------------------------------ */
  function statusStyle(s) {
    switch (String(s || '').toLowerCase()) {
      case 'upcoming': return 'badge-blue';
      case 'completed': return 'badge-gray';
      case 'cancelled': return 'badge-red';
      default: return 'badge-gray';
    }
  }
  function payStyle(s) {
    return String(s || '').toLowerCase() === 'paid' ? 'badge-green' : 'badge-yellow';
  }
  function isDone(s) { return String(s || '').toLowerCase() === 'completed'; }

  function render() {
    const mount = document.getElementById('bookings-mount');
    if (!mount) return;

    const html =
      '<div class="flex align-center justify-between" style="flex-wrap:wrap;gap:1rem;margin-bottom:1.5rem">' +
        '<div class="flex align-center" style="gap:.75rem">' +
          '<h2 style="font-size:1.25rem;font-weight:600;color:#111827">Booking History</h2>' +
          '<span class="badge badge-indigo">' + bookings.length + ' ' + (bookings.length === 1 ? 'booking' : 'bookings') + '</span>' +
        '</div>' +
        '<button class="btn btn-outline" id="bk-pdf-all" style="font-size:.875rem">' + CS.icon('download', 'h-4 w-4') + ' Download PDF</button>' +
      '</div>' +
      '<div id="bk-err"></div>' +
      '<div id="bk-area"></div>';
    mount.innerHTML = html;

    const pdfBtn = document.getElementById('bk-pdf-all');
    if (pdfBtn) pdfBtn.addEventListener('click', function () {
      if (!bookings.length) return;
      buildReportPDF(bookings);
    });

    const area = document.getElementById('bk-area');
    if (!bookings.length) {
      area.innerHTML =
        '<div class="empty-state">' +
          '<div class="icon">' + CS.icon('calendar', 'h-6 w-6') + '</div>' +
          '<p style="font-size:1rem;font-weight:500;color:#374151">No bookings</p>' +
          '<p style="margin-top:.35rem;font-size:.875rem;">Get started by creating a new booking.</p>' +
          '<div style="margin-top:1.5rem"><a href="bookings-create.html" class="btn btn-indigo">+ Create New Booking</a></div>' +
        '</div>';
      return;
    }

    area.innerHTML = '<div class="bk-grid">' + bookings.map(card).join('') + '</div>';
    area.querySelectorAll('[data-bk-cancel]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const id = btn.getAttribute('data-bk-cancel');
        const b = bookings.find(function (x) { return String(x.id) === String(id); });
        if (b) askCancel(b);
      });
    });
    area.querySelectorAll('[data-bk-resched]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const id = btn.getAttribute('data-bk-resched');
        const b = bookings.find(function (x) { return String(x.id) === String(id); });
        if (b) openReschedule(b);
      });
    });
    area.querySelectorAll('[data-bk-pdf]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const id = btn.getAttribute('data-bk-pdf');
        const b = bookings.find(function (x) { return String(x.id) === String(id); });
        if (b) singleBookingPDF(b);
      });
    });
  }

  function card(b) {
    const finished = isDone(b.bookingStatus);
    const canAct = !finished && String(b.bookingStatus || '').toLowerCase() !== 'cancelled';
    const lines =
      '<p><strong>Date:</strong> ' + CS.esc(CS.fmtDateTime(b.dateTime)) + '</p>' +
      '<p><strong>Location:</strong> ' + CS.esc(b.location) + '</p>' +
      '<p><strong>Photographer:</strong> ' + CS.esc(b.assignedStaffName || 'To be assigned') + '</p>';
    const actions =
      (canAct
        ? '<button class="btn btn-blue btn-sm" data-bk-resched="' + CS.esc(b.id) + '">Reschedule</button>' +
          '<button class="btn btn-red btn-sm" data-bk-cancel="' + CS.esc(b.id) + '">Cancel</button>'
        : '') +
      '<button class="btn btn-outline btn-sm" data-bk-pdf="' + CS.esc(b.id) + '">' + CS.icon('download', 'h-4 w-4') + ' PDF</button>';
    return '<div class="bk-card' + (finished ? ' completed' : '') + '">' +
      '<div class="top">' +
        '<div class="lines"><h3>' + CS.esc(b.packageName) + '</h3>' + lines + '</div>' +
        '<div class="chip-wrap" style="flex-direction:column;align-items:flex-end">' +
          CS.statusBadge(b.bookingStatus) +
          CS.statusBadge(b.paymentStatus) +
        '</div>' +
      '</div>' +
      '<div class="actions">' + actions + '</div>' +
    '</div>';
  }

  /* ------------------------------ load ------------------------------ */
  function load() {
    const uid = CS.session.userId;
    if (!uid) { window.location.href = 'login.html'; return; }

    let onBook = CS.api.get('/api/bookings/client', { headers: { 'userId': uid } })
      .then(function (data) { bookings = Array.isArray(data) ? data : []; })
      .catch(function (err) {
        document.getElementById('bookings-mount').innerHTML =
          '<div class="alert alert-red">' + CS.icon('camera', 'h-5 w-5') + '<div>Error fetching bookings: ' + CS.esc(err.message) + '</div></div>';
      });

    let onCfg = CS.api.get('/api/bookings/config')
      .then(function (data) { bookingConfig = data || null; })
      .catch(function () { bookingConfig = null; });

    Promise.all([onBook, onCfg]).then(render).catch(render);

    if (CS.qs('success') === 'true') CS.toast('Booking created successfully', 'success');
  }

  /* --------------------------- cancel flow -------------------------- */
  function askCancel(b) {
    CS.confirm('Are you sure you want to cancel this booking for ' + b.packageName + ' scheduled for ' + CS.fmtDateTime(b.dateTime) + '? This action cannot be undone.', 'Cancel Booking')
      .then(function (ok) { if (ok) doCancel(b); });
  }

  function doCancel(b) {
    CS.api.patch('/api/bookings/cancel/' + encodeURIComponent(b.id))
      .then(function (updated) {
        const idx = bookings.findIndex(function (x) { return String(x.id) === String(b.id); });
        if (idx >= 0) bookings[idx] = updated || Object.assign({}, b, { bookingStatus: 'cancelled' });
        render();
        CS.toast('Booking cancelled successfully', 'success');
      })
      .catch(function (err) { CS.alert(err.message || 'Failed to cancel booking'); });
  }

  /* ------------------------- reschedule flow ------------------------ */
  function openReschedule(b) {
    const mount = document.getElementById('rs-mount');
    const cfg = bookingConfig || {};
    const nowMin = new Date().toISOString().slice(0, 16);
    const rules =
      '<ul style="display:flex;flex-direction:column;gap:.35rem;font-size:.875rem;color:#92400e;list-style:disc;padding-left:1.25rem">' +
        '<li>Maximum ' + (cfg.maxBookingsPerDay || 3) + ' bookings allowed per day</li>' +
        '<li>Bookings must be made at least ' + (cfg.minAdvanceBookingDays || 1) + ' day(s) in advance</li>' +
        '<li>Rescheduling must be done at least ' + (cfg.rescheduleWindowHours || 24) + ' hours before the current booking time</li>' +
        '<li>New date must be within ' + (cfg.maxAdvanceBookingDays || 30) + ' days from today</li>' +
      '</ul>';

    mount.innerHTML =
      '<div class="modal-overlay">' +
        '<div class="modal" style="max-width:34rem">' +
          '<div class="modal-head" style="display:flex;align-items:center;gap:.75rem">' +
            '<span style="display:flex;height:2.5rem;width:2.5rem;align-items:center;justify-content:center;border-radius:9999px;background:#fef3c7;color:#d97706">' + CS.icon('clock', 'h-5 w-5') + '</span>' +
            '<h3>Reschedule Booking</h3>' +
          '</div>' +
          '<div class="modal-body">' +
            '<p style="font-size:.875rem;color:#4b5563">Current booking date and time: <strong style="color:#111827">' + CS.esc(CS.fmtDateTime(b.dateTime)) + '</strong></p>' +
            '<div style="margin-top:1rem;background:#fffbeb;border:1px solid #fde68a;border-radius:.5rem;padding:.9rem 1rem">' +
              '<p style="font-size:.875rem;font-weight:600;color:#92400e;margin-bottom:.5rem">Scheduling Rules:</p>' + rules +
            '</div>' +
            '<div style="margin-top:1rem">' +
              '<label for="bk-new-datetime" style="display:block;font-size:.875rem;font-weight:500;color:#374151;margin-bottom:.35rem">Select New Date and Time</label>' +
              '<input type="datetime-local" id="bk-new-datetime" class="input-lite" min="' + nowMin + '" style="border-color:#d1d5db">' +
            '</div>' +
          '</div>' +
          '<div class="modal-foot">' +
            '<button class="btn btn-outline" id="bk-rs-cancel">Cancel</button>' +
            '<button class="btn btn-indigo" id="bk-rs-ok">Confirm Reschedule</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    const input = document.getElementById('bk-new-datetime');
    const close = function () { mount.innerHTML = ''; };
    document.getElementById('bk-rs-cancel').addEventListener('click', close);
    mount.querySelector('.modal-overlay').addEventListener('click', function (e) { if (e.target === this) close(); });
    document.getElementById('bk-rs-ok').addEventListener('click', function () {
      const val = input.value;
      if (!val) { CS.toast('Please select a date and time', 'error'); return; }
      submitReschedule(b, val, close);
    });
  }

  function submitReschedule(b, newDateTime, close) {
    const uid = CS.session.userId;
    CS.api.put('/api/bookings/reschedule/' + encodeURIComponent(b.id), { dateTime: newDateTime }, uid ? { 'userId': uid } : null)
      .then(function (updated) {
        const idx = bookings.findIndex(function (x) { return String(x.id) === String(b.id); });
        if (idx >= 0) bookings[idx] = updated;
        render();
        close();
        CS.toast('Booking rescheduled successfully', 'success');
      })
      .catch(function (err) {
        close();
        if (err.message && String(err.message).indexOf('Cannot create more than') >= 0) {
          CS.alert(err.message);
        } else {
          CS.alert(err.message || 'Could not reschedule the booking');
        }
      });
  }

  /* ------------------------------ PDFs ------------------------------ */
  function addHeader(pdf, y) {
    pdf.text('Your Photography Bookings', pdf.width / 2, y, { size: 20, bold: true, color: INDIGO, align: 'center' });
    pdf.text('Curate and manage your upcoming photo sessions with ease', pdf.width / 2, y + 10, { size: 12, color: SLATE, align: 'center' });
    pdf.line(pdf.margin, y + 18, pdf.width - pdf.margin, y + 18, 0.5, INDIGO);
    return y + 26;
  }
  function addFooter(pdf, pageNo, pageCount) {
    const fy = pdf.height - 22;
    pdf.line(pdf.margin, fy - 6, pdf.width - pdf.margin, fy - 6, 0.2, [226, 232, 240]);
    pdf.text('Photography Studio', pdf.margin, fy, { size: 8, color: SLATE });
    pdf.text('Email: kamaraabdulrahman547@gmail.com', pdf.margin, fy + 5, { size: 8, color: SLATE });
    pdf.text('Phone: +232 99 738064', pdf.margin, fy + 10, { size: 8, color: SLATE });
    pdf.text('Page ' + pageNo + ' of ' + pageCount, pdf.width - pdf.margin, fy, { size: 8, color: SLATE, align: 'right' });
  }

  function pdfBookingBlock(pdf, b, idx, y) {
    if (y > pdf.height - 90) { pdf.addPage(); y = addHeader(pdf, 40); }
    pdf.text('Booking #' + idx, pdf.margin, y, { size: 16, bold: true, color: INDIGO });
    y += 12;

    pdf.text('Package:', pdf.margin, y, { size: 12, bold: true, color: DARK });
    pdf.text(String(b.packageName || ''), pdf.margin + 60, y, { size: 12 });
    y += 10;

    pdf.text('Price:', pdf.margin, y, { size: 12, bold: true, color: DARK });
    pdf.text('Rs ' + Number(b.price || 0).toFixed(2), pdf.margin + 60, y, { size: 12 });
    y += 10;

    pdf.text('Status:', pdf.margin, y, { size: 12, bold: true, color: DARK });
    pdf.text(String(b.bookingStatus || ''), pdf.margin + 60, y, { size: 12, color: statusRGB(b.bookingStatus) });
    y += 10;

    pdf.text('Date & Time:', pdf.margin, y, { size: 12, bold: true, color: DARK });
    pdf.text(CS.fmtDateTime(b.dateTime), pdf.margin + 60, y, { size: 12 });
    y += 10;

    pdf.text('Location:', pdf.margin, y, { size: 12, bold: true, color: DARK });
    pdf.text(String(b.location || ''), pdf.margin + 60, y, { size: 12 });
    y += 10;

    pdf.text('Photographer:', pdf.margin, y, { size: 12, bold: true, color: DARK });
    pdf.text(String(b.assignedStaffName || 'To be assigned'), pdf.margin + 60, y, { size: 12 });
    y += 10;

    pdf.text('Payment Status:', pdf.margin, y, { size: 12, bold: true, color: DARK });
    pdf.text(String(b.paymentStatus || ''), pdf.margin + 60, y, { size: 12 });
    y += 10;

    pdf.text('Contact:', pdf.margin, y, { size: 12, bold: true, color: DARK });
    pdf.text(String(b.phoneNumber || ''), pdf.margin + 60, y, { size: 12 });
    y += 10;

    pdf.text('Email:', pdf.margin, y, { size: 12, bold: true, color: DARK });
    pdf.text(String(b.email || ''), pdf.margin + 60, y, { size: 12 });
    y += 15;

    pdf.line(pdf.margin, y, pdf.width - pdf.margin, y, 0.2, [226, 232, 240]);
    return y + 12;
  }

  function statusRGB(s) {
    const v = String(s || '').toLowerCase();
    if (v === 'cancelled') return RED;
    if (v === 'completed') return GREEN;
    if (v === 'upcoming') return BLUE;
    return DARK;
  }

  function buildReportPDF(list) {
    const pdf = CS.pdf.create('bookings-report.pdf');
    let y = addHeader(pdf, 40);
    list.forEach(function (b, i) { y = pdfBookingBlock(pdf, b, i + 1, y); });
    const pageCount = pdf.pages.length;
    pdf.pages.forEach(function (_, i) { addFooter(pdf, i + 1, pageCount); });
    pdf.save('bookings-report.pdf');
  }

  function singleBookingPDF(b) {
    const pdf = CS.pdf.create('booking-' + b.id + '.pdf');
    pdf.text('Your Photography Bookings', pdf.width / 2, 25, { size: 20, bold: true, color: INDIGO, align: 'center' });
    pdf.text('Curate and manage your upcoming photo sessions with ease', pdf.width / 2, 33, { size: 12, color: SLATE, align: 'center' });
    pdf.line(pdf.margin, 40, pdf.width - pdf.margin, 40, 0.5, INDIGO);
    const y = pdfBookingBlock(pdf, b, 1, 52);
    const fy = pdf.height - 22;
    pdf.line(pdf.margin, fy - 6, pdf.width - pdf.margin, fy - 6, 0.2, [226, 232, 240]);
    pdf.text('Photography Studio', pdf.margin, fy, { size: 8, color: SLATE });
    pdf.text('Email: kamaraabdulrahman547@gmail.com', pdf.margin, fy + 5, { size: 8, color: SLATE });
    pdf.text('Phone: +232 99 738064', pdf.margin, fy + 10, { size: 8, color: SLATE });
    pdf.save('booking-' + b.id + '.pdf');
  }

  window.addEventListener('DOMContentLoaded', load);
})();