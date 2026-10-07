/* ================================================================== */
/*  Critical Shot — admin booking detail (edit / new)                 */
/*  Edit  GET/PUT /admin/bookings/:id                                 */
/*  New   POST   /api/bookings/create (header Userid)                 */
/* ================================================================== */
(function () {
  'use strict';
  const CS = window.CS;

  const LOCATIONS = [
    { name: 'Freetown', multiplier: 1.0 },
    { name: 'Western Area Peninsula', multiplier: 1.1 },
    { name: 'Waterloo', multiplier: 1.1 },
    { name: 'Port Loko', multiplier: 1.2 },
    { name: 'Bo', multiplier: 1.3 },
    { name: 'Makeni', multiplier: 1.3 },
    { name: 'Kenema', multiplier: 1.4 },
    { name: 'Moyamba', multiplier: 1.4 },
    { name: 'Kambia', multiplier: 1.5 },
    { name: 'Koidu', multiplier: 1.5 },
    { name: 'Kailahun', multiplier: 1.6 },
    { name: 'Pujehun', multiplier: 1.6 },
    { name: 'Kabala', multiplier: 1.7 },
    { name: 'Falaba', multiplier: 1.7 },
    { name: 'Bonthe', multiplier: 1.8 }
  ];

  const id = CS.qs('id');
  const isNew = !id;

  function money(n) { return Number(n || 0).toLocaleString(); }

  function renderEdit(b) {
    const mount = document.getElementById('bd-mount');
    const dt = new Date(b.dateTime);
    const dateStr = isNaN(dt) ? '' : dt.toISOString().split('T')[0];
    const timeStr = isNaN(dt) ? '' : dt.toTimeString().split(' ')[0].substring(0, 5);

    mount.innerHTML =
      '<div class="card" style="padding:1.5rem 1.75rem 2rem;max-width:48rem">' +
        '<div class="flex align-center" style="gap:1rem;margin-bottom:1.5rem;flex-wrap:wrap">' +
          '<span style="display:inline-flex;align-items:center;gap:.4rem;font-size:.875rem;color:#6b7280">' + CS.icon('calendar', 'h-4 w-4') + ' Booking #' + CS.esc(b.id) + '</span>' +
          CS.statusBadge(b.bookingStatus) + CS.statusBadge(b.paymentStatus) +
        '</div>' +
        '<div class="grid-2" style="margin-bottom:1.25rem">' +
          '<div><p class="text-gray" style="font-size:.75rem;text-transform:uppercase;letter-spacing:.05em">Package</p><p style="font-weight:600;color:#111827">' + CS.esc(b.packageName || '-') + '</p></div>' +
          '<div><p class="text-gray" style="font-size:.75rem;text-transform:uppercase;letter-spacing:.05em">Client</p><p style="font-weight:600;color:#111827">' + CS.esc(b.email || b.clientId || '-') + '</p></div>' +
          '<div><p class="text-gray" style="font-size:.75rem;text-transform:uppercase;letter-spacing:.05em">Location</p><p style="font-weight:600;color:#111827">' + CS.esc(b.location || '-') + '</p></div>' +
          '<div><p class="text-gray" style="font-size:.75rem;text-transform:uppercase;letter-spacing:.05em">Price</p><p style="font-weight:600;color:#111827">Rs ' + money(b.price) + '</p></div>' +
          '<div><p class="text-gray" style="font-size:.75rem;text-transform:uppercase;letter-spacing:.05em">Contact</p><p style="font-weight:600;color:#111827">' + CS.esc(b.phoneNumber || '-') + '</p></div>' +
          '<div><p class="text-gray" style="font-size:.75rem;text-transform:uppercase;letter-spacing:.05em">Photographer</p><p style="font-weight:600;color:#111827">' + CS.esc(b.assignedStaffName || 'Not assigned') + '</p></div>' +
        '</div>' +
        '<form id="edit-form" novalidate style="border-top:1px solid #e5e7eb;padding-top:1.5rem">' +
          '<div class="form-2col">' +
            '<div class="field"><label for="e-date">Date</label><input type="date" id="e-date" class="input-lite" value="' + CS.esc(dateStr) + '"></div>' +
            '<div class="field"><label for="e-time">Time</label><input type="time" id="e-time" class="input-lite" value="' + CS.esc(timeStr) + '"></div>' +
            '<div class="field">' +
              '<label for="e-status">Status</label>' +
              '<select id="e-status" class="input-lite">' +
                '<option value="upcoming"' + (b.bookingStatus === 'upcoming' ? ' selected' : '') + '>Upcoming</option>' +
                '<option value="completed"' + (b.bookingStatus === 'completed' ? ' selected' : '') + '>Completed</option>' +
                '<option value="cancelled"' + (b.bookingStatus === 'cancelled' ? ' selected' : '') + '>Cancelled</option>' +
              '</select>' +
            '</div>' +
            '<div class="field">' +
              '<label for="e-pay">Payment Status</label>' +
              '<select id="e-pay" class="input-lite">' +
                '<option value="pending"' + (b.paymentStatus === 'pending' ? ' selected' : '') + '>Pending</option>' +
                '<option value="paid"' + (b.paymentStatus === 'paid' ? ' selected' : '') + '>Paid</option>' +
                '<option value="refunded"' + (b.paymentStatus === 'refunded' ? ' selected' : '') + '>Refunded</option>' +
              '</select>' +
            '</div>' +
          '</div>' +
          '<div id="e-err"></div>' +
          '<div class="flex justify-end" style="gap:.75rem;margin-top:1.25rem;padding-top:1.25rem;border-top:1px solid #e5e7eb">' +
            '<a href="bookings-admin.html" class="btn btn-outline">Cancel</a>' +
            '<button type="submit" class="btn btn-indigo" id="e-save">Save</button>' +
          '</div>' +
        '</form>' +
      '</div>';

    document.getElementById('edit-form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      saveEdit(b);
    });
  }

  function saveEdit(b) {
    const date = document.getElementById('e-date').value;
    const time = document.getElementById('e-time').value;
    if (!date || !time) {
      document.getElementById('e-err').innerHTML = '<div class="alert alert-red">Date and time are required</div>';
      return;
    }
    const dateTime = new Date(date + 'T' + time);
    if (dateTime <= new Date()) {
      document.getElementById('e-err').innerHTML = '<div class="alert alert-red">Booking date must be in the future</div>';
      return;
    }
    const btn = document.getElementById('e-save');
    btn.disabled = true;
    btn.textContent = 'Saving...';
    CS.api.put('/admin/bookings/' + encodeURIComponent(id), {
      dateTime: date + 'T' + time,
      bookingStatus: document.getElementById('e-status').value,
      paymentStatus: document.getElementById('e-pay').value
    })
      .then(function () {
        CS.toast('Booking updated successfully', 'success');
        window.location.href = 'bookings-admin.html';
      })
      .catch(function (err) {
        btn.disabled = false;
        btn.textContent = 'Save';
        const msg = err.data && typeof err.data === 'string' ? err.data : (err.message || 'An error occurred while updating the booking');
        document.getElementById('e-err').innerHTML = '<div class="alert alert-red">' + msg + '</div>';
      });
  }

  /* ------------------------------ new ------------------------------ */
  function renderNew(packages) {
    const mount = document.getElementById('bd-mount');
    mount.innerHTML =
      '<form id="new-form" novalidate class="card" style="padding:1.5rem 1.75rem 2rem;max-width:48rem">' +
        '<div class="form-2col">' +
          '<div class="field"><label for="n-email">Email <span class="req">*</span></label><input type="text" id="n-email" class="input-lite" placeholder="you@example.com"></div>' +
          '<div class="field"><label for="n-phone">Phone Number <span class="req">*</span></label><input type="tel" id="n-phone" class="input-lite" placeholder="123-456-7890"></div>' +
          '<div class="field">' +
            '<label for="n-location">Location <span class="req">*</span></label>' +
            '<select id="n-location" class="input-lite"><option value="">Select a location</option>' +
              LOCATIONS.map(function (l) { return '<option value="' + CS.esc(l.name) + '">' + CS.esc(l.name) + '</option>'; }).join('') +
            '</select>' +
          '</div>' +
          '<div class="field">' +
            '<label for="n-package">Package <span class="req">*</span></label>' +
            '<select id="n-package" class="input-lite"><option value="">Select a package</option>' +
              packages.map(function (p) { return '<option value="' + CS.esc(p.name) + '">' + CS.esc(p.name) + '</option>'; }).join('') +
            '</select>' +
          '</div>' +
          '<div class="field"><label for="n-date">Date <span class="req">*</span></label><input type="date" id="n-date" class="input-lite" min="' + new Date().toISOString().split('T')[0] + '"></div>' +
          '<div class="field"><label for="n-time">Time <span class="req">*</span></label><input type="time" id="n-time" class="input-lite"></div>' +
        '</div>' +
        '<div id="n-price" style="display:none;margin-top:1rem;padding:.85rem 1.1rem;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:.5rem">' +
          '<div class="flex align-center justify-between"><span style="color:#166534">Total Price:</span><span id="n-price-val" style="font-weight:700;color:#14532d">Le 0</span></div>' +
        '</div>' +
        '<div id="n-err"></div>' +
        '<div class="flex justify-end" style="gap:.75rem;margin-top:1.25rem;padding-top:1.25rem;border-top:1px solid #e5e7eb">' +
          '<a href="bookings-admin.html" class="btn btn-outline">Cancel</a>' +
          '<button type="submit" class="btn btn-indigo">Create Booking</button>' +
        '</div>' +
      '</form>';

    document.getElementById('n-location').addEventListener('change', recalc);
    document.getElementById('n-package').addEventListener('change', recalc);
    document.getElementById('new-form').addEventListener('submit', submitNew);
  }

  function recalc() {
    const box = document.getElementById('n-price');
    const loc = document.getElementById('n-location').value;
    const pname = document.getElementById('n-package').value;
    if (!pname) { box.style.display = 'none'; return; }
    const pkg = window.__npkgs.find(function (p) { return p.name === pname; });
    if (!pkg) { box.style.display = 'none'; return; }
    const city = LOCATIONS.find(function (l) { return l.name === loc; });
    const price = city ? Math.round(pkg.investment * city.multiplier) : pkg.investment;
    box.style.display = 'block';
    document.getElementById('n-price-val').textContent = 'Le ' + price.toLocaleString();
  }

  function submitNew(e) {
    e.preventDefault();
    const uid = CS.session.userId;
    const reEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const rePhone = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
    const email = document.getElementById('n-email').value.trim();
    const phone = document.getElementById('n-phone').value.trim();
    const location = document.getElementById('n-location').value;
    const pname = document.getElementById('n-package').value;
    const date = document.getElementById('n-date').value;
    const time = document.getElementById('n-time').value;

    if (!email || !reEmail.test(email)) { return err('Please provide a valid email'); }
    if (!phone || !rePhone.test(phone)) { return err('Please provide a valid phone number'); }
    if (!location) { return err('Please select a location'); }
    if (!pname) { return err('Please select a package'); }
    if (!date || !time) { return err('Please provide a date and time'); }
    if (new Date(date + 'T' + time) <= new Date()) { return err('Booking date must be in the future'); }

    const pkg = window.__npkgs.find(function (p) { return p.name === pname; });
    const city = LOCATIONS.find(function (l) { return l.name === location; });
    const price = pkg && city ? Math.round(pkg.investment * city.multiplier) : (pkg ? pkg.investment : 0);

    CS.api.post('/api/bookings/create', {
      email: email,
      phoneNumber: phone,
      location: location,
      packageName: pname,
      dateTime: date + 'T' + time,
      clientId: uid,
      price: price
    }, { 'Userid': uid })
      .then(function () {
        CS.toast('Booking created successfully', 'success');
        window.location.href = 'bookings-admin.html';
      })
      .catch(function (er) {
        err(er.message || 'Failed to create booking');
      });
  }

  function err(msg) {
    const box = document.getElementById('n-err');
    if (box) box.innerHTML = '<div class="alert alert-red">' + CS.esc(msg) + '</div>';
  }

  function load() {
    if (String(CS.session.role || '').toUpperCase() !== 'ADMIN') {
      window.location.href = 'login.html';
      return;
    }
    CS.renderAdminShell('admin-shell');

    document.getElementById('bd-title').textContent = isNew ? 'New Booking' : 'Edit Booking';
    document.getElementById('bd-sub').textContent = isNew ? 'Create a booking on behalf of a client' : 'View and update this booking';

    if (isNew) {
      CS.api.get('/api/packages').then(function (data) {
        window.__npkgs = Array.isArray(data) ? data : [];
        renderNew(window.__npkgs);
      }).catch(function () {
        window.__npkgs = [];
        renderNew(window.__npkgs);
      });
      return;
    }

    CS.api.get('/admin/bookings/' + encodeURIComponent(id))
      .then(renderEdit)
      .catch(function () {
        document.getElementById('bd-mount').innerHTML = '<div class="alert alert-red">Failed to load booking details</div>';
      });
  }

  window.addEventListener('DOMContentLoaded', load);
})();