/* ================================================================== */
/*  Critical Shot — admin booking table                               */
/*  List    GET /admin/bookings                                       */
/*  Delete  DELETE /admin/bookings/:id                                */
/* ================================================================== */
(function () {
  'use strict';
  const CS = window.CS;

  let bookings = [];
  let searchTerm = '';
  let statusFilter = 'all';
  let selected = [];

  const STATUS_COLORS = {
    upcoming: 'bgcolor=#e6f4ea;color=#1e4620;icon=🟢;label=Upcoming',
    completed: 'bgcolor=#fff3e0;color=#e65100;icon=✅;label=Completed',
    cancelled: 'bgcolor=#ffebee;color=#c62828;icon=❌;label=Cancelled'
  };
  const PAY_COLORS = {
    paid: 'bgcolor=#e8f5e9;color=#2e7d32;icon=💰;label=Paid',
    pending: 'bgcolor=#fff3e0;color=#e65100;icon=⏳;label=Pending',
    refunded: 'bgcolor=#fce4ec;color=#c2185b;icon=↩️;label=Refunded'
  };

  function chip(s, map) {
    const v = String(s || '').toLowerCase();
    const def = map.default;
    const meta = map[v] ? map[v].split(';') : def.split(';');
    const obj = {};
    meta.forEach(function (kv) { const p = kv.split('='); obj[p[0]] = p[1]; });
    return '<span style="display:inline-flex;align-items:center;gap:.4rem;background:' + obj.bgcolor + ';color:' + obj.color + ';border-radius:9999px;padding:.25rem .75rem;font-size:.75rem;font-weight:500;white-space:nowrap">' + obj.icon + ' ' + obj.label + '</span>';
  }
  function statusChip(s) {
    return chip(s, Object.assign({ default: 'bgcolor=#f5f5f5;color=#616161;icon=❓;label=' + String(s || 'Unknown') }, STATUS_COLORS));
  }
  function payChip(s) {
    return chip(s, Object.assign({ default: 'bgcolor=#f5f5f5;color=#616161;icon=❓;label=' + String(s || 'Unknown') }, PAY_COLORS));
  }

  function filtered() {
    let list = bookings;
    if (statusFilter !== 'all') {
      list = list.filter(function (b) { return String(b.bookingStatus).toLowerCase() === statusFilter; });
    }
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      list = list.filter(function (b) {
        return [b.id, b.dateTime, b.location, b.packageName, b.bookingStatus, b.paymentStatus, b.assignedStaffName]
          .some(function (f) { return String(f || '').toLowerCase().indexOf(t) >= 0; });
      });
    }
    return list;
  }

  function render() {
    const mount = document.getElementById('ba-mount');
    if (!mount) return;
    const list = filtered();

    const tool =
      '<div class="flex align-center justify-between" style="flex-wrap:wrap;gap:1rem;margin-bottom:1rem">' +
        '<div class="flex align-center" style="gap:.75rem">' +
          '<h2 style="font-size:1.1rem;font-weight:600;color:#111827">All Bookings</h2>' +
          '<span class="badge badge-indigo" id="ba-count">' + list.length + ' ' + (list.length === 1 ? 'booking' : 'bookings') + '</span>' +
        '</div>' +
        '<div class="flex align-center" style="gap:.6rem">' +
          '<select id="ba-status" class="input-lite" style="width:auto;padding:.5rem .75rem">' +
            '<option value="all">All Statuses</option>' +
            '<option value="upcoming">Upcoming</option>' +
            '<option value="completed">Completed</option>' +
            '<option value="cancelled">Cancelled</option>' +
          '</select>' +
          '<input id="ba-search" class="input-lite" placeholder="Search bookings..." style="width:16rem;padding:.5rem .75rem" value="' + CS.esc(searchTerm) + '">' +
        '</div>' +
      '</div>' +
      '<div id="ba-err"></div>';

    let body;
    if (!list.length) {
      body = '<div class="empty-state" style="background:#f9fafb;border:1px dashed #e5e7eb;border-radius:.5rem">' +
        '<div class="icon">' + CS.icon('calendar', 'h-6 w-6') + '</div>' +
        '<p style="font-weight:500;color:#374151">No bookings found</p>' +
        '<p style="margin-top:.35rem;font-size:.875rem">' + (bookings.length ? 'No bookings match your search criteria.' : 'There are no bookings in the system yet.') + '</p>' +
      '</div>';
    } else {
      body =
        '<div class="table-wrap" style="border:1px solid #e5e7eb;border-radius:.5rem">' +
          '<table class="data">' +
            '<thead><tr>' +
              '<th style="width:2.5rem"><input type="checkbox" id="ba-select-all"></th>' +
              '<th>ID</th><th>Date &amp; Time</th><th>Location</th><th>Package</th>' +
              '<th>Assigned Staff</th><th>Status</th><th>Payment</th><th style="text-align:right">Actions</th>' +
            '</tr></thead>' +
            '<tbody>' + list.map(row).join('') + '</tbody>' +
          '</table>' +
        '</div>' +
        (selected.length
          ? '<div class="flex align-center justify-between" style="position:fixed;bottom:1rem;left:50%;transform:translateX(-50%);z-index:80;background:#fff;border:1px solid #e5e7eb;box-shadow:0 12px 32px rgba(0,0,0,.15);border-radius:.6rem;padding:.8rem 1.1rem;min-width:18rem">' +
              '<span style="font-size:.875rem;color:#374151">' + selected.length + ' selected</span>' +
              '<button class="btn btn-red btn-sm" id="ba-delete-selected">' + CS.icon('trash', 'h-4 w-4') + ' Delete Selected</button>' +
            '</div>'
          : '');
    }

    mount.innerHTML = tool + body;
    document.getElementById('ba-count').textContent = list.length + ' ' + (list.length === 1 ? 'booking' : 'bookings');

    if (selected && selected.length) {
      const bar = document.getElementById('ba-delete-selected');
      if (bar) bar.addEventListener('click', function () {
        askDelete('Delete ' + selected.length + ' ' + (selected.length === 1 ? 'booking' : 'bookings'), selected.slice());
      });
    }
    if (list.length) {
      const sa = document.getElementById('ba-select-all');
      if (sa) {
        sa.checked = selected.length === list.length;
        sa.addEventListener('change', function () {
          selected = sa.checked ? list.map(function (b) { return String(b.id); }) : [];
          render();
        });
      }
      mount.querySelectorAll('[data-del]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const id = btn.getAttribute('data-del');
          const b = bookings.find(function (x) { return String(x.id) === String(id); });
          askDelete(detail(b), [id]);
        });
      });
    }
    document.getElementById('ba-status').value = statusFilter;
    document.getElementById('ba-status').addEventListener('change', function (e) { statusFilter = e.target.value; render(); });
    document.getElementById('ba-search').addEventListener('input', function (e) { searchTerm = e.target.value; render(); });
    bindChecks();
  }

  function row(b) {
    const checked = selected.indexOf(String(b.id)) >= 0;
    return '<tr' + (checked ? ' style="background:#faf5ff"' : '') + '>' +
      '<td><input type="checkbox" class="ba-check" data-id="' + CS.esc(b.id) + '"' + (checked ? ' checked' : '') + '></td>' +
      '<td>' + CS.esc(b.id || '-') + '</td>' +
      '<td>' +
        '<div style="font-weight:500;color:#111827">' + CS.esc(CS.fmtDate(b.dateTime)) + '</div>' +
        '<div style="font-size:.75rem;color:#6b7280">' + CS.esc(new Date(b.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) + '</div>' +
      '</td>' +
      '<td style="font-weight:500">' + CS.esc(b.location || '-') + '</td>' +
      '<td><span class="badge badge-purple">' + CS.esc(b.packageName || '-') + '</span></td>' +
      '<td style="color:#4b5563">' + CS.esc(b.assignedStaffName || 'Not assigned') + '</td>' +
      '<td>' + statusChip(b.bookingStatus) + '</td>' +
      '<td>' + payChip(b.paymentStatus) + '</td>' +
      '<td style="text-align:right;white-space:nowrap">' +
        '<a class="btn btn-outline btn-sm" href="bookings-admin-detail.html?id=' + encodeURIComponent(b.id) + '" title="Edit">' + CS.icon('edit', 'h-4 w-4') + '</a> ' +
        '<button class="btn btn-sm" data-del="' + CS.esc(b.id) + '" title="Delete" style="background:#fee2e2;color:#b91c1c;border-color:transparent">' + CS.icon('trash', 'h-4 w-4') + '</button>' +
      '</td>' +
    '</tr>';
  }

  function bindChecks() {
    document.querySelectorAll('.ba-check').forEach(function (cb) {
      cb.addEventListener('change', function () {
        const id = cb.getAttribute('data-id');
        const i = selected.indexOf(id);
        if (cb.checked && i < 0) selected.push(id);
        if (!cb.checked && i >= 0) selected.splice(i, 1);
        render();
      });
    });
  }

  function detail(b) {
    return 'Booking #' + b.id + ' for ' + (b.packageName || '') + ' on ' + CS.fmtDateTime(b.dateTime);
  }

  function askDelete(what, ids) {
    CS.modal({
      title: 'Delete ' + (ids.length === 1 ? 'Booking' : 'Bookings'),
      message: 'Are you sure you want to delete ' + what + '? This action cannot be undone.',
      okText: 'Delete',
      cancelText: 'Cancel',
      kind: 'error',
      icon: CS.icon('trash', 'h-5 w-5')
    }).then(function (ok) { if (ok) doDelete(ids); });
  }

  function doDelete(ids) {
    const failed = [];
    const chain = ids.reduce(function (p, id) {
      return p.then(function () {
        return CS.api.del('/admin/bookings/' + encodeURIComponent(id))
          .catch(function () { failed.push(id); });
      });
    }, Promise.resolve());
    chain.then(function () {
      const okIds = ids.filter(function (id) { return failed.indexOf(id) < 0; });
      if (okIds.length) {
        bookings = bookings.filter(function (b) { return okIds.indexOf(String(b.id)) < 0; });
      }
      selected = [];
      render();
      if (failed.length) CS.toast('Failed to delete ' + failed.length + ' booking(s)', 'error');
      else CS.toast('Booking deleted successfully', 'success');
    });
  }

  function load() {
    if (String(CS.session.role || '').toUpperCase() !== 'ADMIN') {
      window.location.href = 'login.html';
      return;
    }
    CS.renderAdminShell('admin-shell');
    CS.api.get('/admin/bookings').then(function (data) {
      bookings = Array.isArray(data) ? data : [];
      render();
    }).catch(function (err) {
      bookings = [];
      render();
      document.getElementById('ba-err').innerHTML = '<div class="alert alert-red">' + CS.icon('camera', 'h-5 w-5') + '<div>Failed to fetch bookings. Please try again later.</div></div>';
    });
  }

  window.addEventListener('DOMContentLoaded', load);
})();