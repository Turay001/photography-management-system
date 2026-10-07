/* ================================================================== */
/*  Critical Shot — staff profile                                     */
/*  GET /api/staff/:id, PUT /api/staff/:id (full object on save)      */
/* ================================================================== */
(function () {
  'use strict';
  const CS = window.CS;

  const id = CS.qs('id');
  let staff = null;
  let editing = false;

  function datePart(v) { return v ? String(v).split('T')[0] : ''; }

  function fmtRange() {
    const from = staff.availabilityStartDate ? CS.fmtDate(String(staff.availabilityStartDate).split('T')[0]) : 'Not specified';
    const to = staff.availabilityEndDate ? CS.fmtDate(String(staff.availabilityEndDate).split('T')[0]) : 'Not specified';
    return from + ' - ' + to;
  }

  function viewHtml() {
    return '<div class="card" style="padding:1.75rem">' +
      '<div class="pg-section">' +
        '<h3 style="font-size:1rem;font-weight:700;color:#111827;margin:0 0 1rem">Personal Information</h3>' +
        '<div class="grid2">' +
          '<div><p class="pg-label">Full Name</p><p class="pg-val">' + CS.esc(staff.name || '-') + '</p></div>' +
          '<div><p class="pg-label">Phone Number</p><p class="pg-val">' + CS.esc(staff.phone || '-') + '</p></div>' +
          '<div><p class="pg-label">Email</p><p class="pg-val">' + CS.esc(staff.email || '-') + '</p></div>' +
          '<div><p class="pg-label">Address</p><p class="pg-val">' + CS.esc(staff.address || '-') + '</p></div>' +
        '</div>' +
      '</div>' +
      '<hr style="border:0;border-top:1px solid #e5e7eb;margin:1.5rem 0">' +
      '<div class="pg-section">' +
        '<h3 style="font-size:1rem;font-weight:700;color:#111827;margin:0 0 1rem">Availability</h3>' +
        '<div class="grid2">' +
          '<div><p class="pg-label">Status</p><p class="pg-val"><span class="badge ' + (staff.availability ? 'badge-green' : 'badge-red') + '">' + (staff.availability ? 'Available' : 'Busy') + '</span></p></div>' +
          '<div><p class="pg-label">Availability Range</p><p class="pg-val">' + CS.esc(fmtRange()) + '</p></div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function editHtml() {
    return '<div class="card" style="padding:1.75rem">' +
      '<h3 style="font-size:1rem;font-weight:700;color:#111827;margin:0 0 1rem">Edit Profile</h3>' +
      '<div class="field"><label>Full Name <span class="req">*</span></label><input type="text" id="e-name" class="input-lite" value="' + CS.esc(staff.name || '') + '" required></div>' +
      '<div class="field"><label>Email <span class="req">*</span></label><input type="email" id="e-email" class="input-lite" value="' + CS.esc(staff.email || '') + '" required></div>' +
      '<div class="field"><label>Phone Number <span class="req">*</span></label><input type="tel" id="e-phone" class="input-lite" pattern="[0-9]{10}" value="' + CS.esc(staff.phone || '') + '" required></div>' +
      '<div class="field"><label>Address <span class="req">*</span></label><input type="text" id="e-address" class="input-lite" value="' + CS.esc(staff.address || '') + '" required></div>' +
      '<div class="field"><label>Status</label>' +
        '<select id="e-avail" class="input-lite"><option value="true"' + (staff.availability ? ' selected' : '') + '>Available</option><option value="false"' + (!staff.availability ? ' selected' : '') + '>Busy</option></select>' +
      '</div>' +
      '<div class="form-2col">' +
        '<div class="field"><label>From</label><input type="date" id="e-from" class="input-lite" value="' + CS.esc(datePart(staff.availabilityStartDate)) + '"></div>' +
        '<div class="field"><label>To</label><input type="date" id="e-to" class="input-lite" value="' + CS.esc(datePart(staff.availabilityEndDate)) + '"></div>' +
      '</div>' +
      '<div id="e-err"></div>' +
      '<div class="flex justify-end" style="gap:.75rem;margin-top:1.25rem;padding-top:1.25rem;border-top:1px solid #e5e7eb">' +
        '<button type="button" class="btn btn-outline" id="e-cancel">Cancel</button>' +
        '<button type="button" class="btn btn-indigo" id="e-save">Save Changes</button>' +
      '</div>' +
    '</div>';
  }

  function render() {
    document.getElementById('sp-welcome').textContent = 'Welcome, ' + (staff.name || '').split(' ')[0];
    const mount = document.getElementById('sp-mount');
    mount.innerHTML = editing ? editHtml() : viewHtml();
    if (!editing) return;
    document.getElementById('e-cancel').addEventListener('click', function () { editing = false; render(); });
    document.getElementById('e-save').addEventListener('click', save);
  }

  function save() {
    setErr('');
    const name = document.getElementById('e-name').value.trim();
    const email = document.getElementById('e-email').value.trim();
    const phone = document.getElementById('e-phone').value.trim();
    const address = document.getElementById('e-address').value.trim();
    const availability = document.getElementById('e-avail').value === 'true';
    const availabilityStartDate = document.getElementById('e-from').value;
    const availabilityEndDate = document.getElementById('e-to').value;

    if (!name) return setErr('Full name is required.');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr('Please enter a valid email address.');
    if (!/^[0-9]{10}$/.test(phone)) return setErr('Phone number must be 10 digits.');
    if (!address) return setErr('Address is required.');

    const payload = Object.assign({}, staff, {
      name: name,
      email: email,
      phone: phone,
      address: address,
      availability: availability,
      availabilityStartDate: availabilityStartDate,
      availabilityEndDate: availabilityEndDate
    });

    const btn = document.getElementById('e-save');
    btn.disabled = true;
    btn.textContent = 'Saving...';
    CS.api.put('/api/staff/' + encodeURIComponent(id), payload)
      .then(function (data) {
        staff = data ? Object.assign({}, staff, data) : payload;
        editing = false;
        CS.toast('Profile updated successfully!', 'success');
        render();
      })
      .catch(function () {
        btn.disabled = false;
        btn.textContent = 'Save Changes';
        setErr('Failed to update profile.');
      });
  }

  function setErr(msg) {
    document.getElementById('e-err').innerHTML = msg ? '<div class="alert alert-red">' + CS.esc(msg) + '</div>' : '';
  }

  function load() {
    if (!CS.session.isLoggedIn()) { window.location.href = 'login.html'; return; }
    document.getElementById('sp-date').textContent = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'long', year: 'numeric', day: 'numeric' });
    const role = String(CS.session.role || '').toUpperCase();
    const back = document.getElementById('sp-back');
    if (role === 'ADMIN') { back.href = 'staff.html'; back.style.display = 'inline-flex'; }
    else if (role === 'STAFF') { back.href = 'staff-dashboard.html'; back.style.display = 'inline-flex'; }

    document.getElementById('sp-editbtn').addEventListener('click', function () {
      if (!staff) return;
      editing = true;
      render();
    });

    if (!id) {
      document.getElementById('sp-mount').innerHTML = '<div class="alert alert-red">Staff ID not found</div>';
      return;
    }
    CS.api.get('/api/staff/' + encodeURIComponent(id))
      .then(function (data) {
        if (!data || !data.id) { document.getElementById('sp-mount').innerHTML = '<div class="alert alert-red">Staff not found</div>'; return; }
        staff = data;
        render();
      })
      .catch(function () { document.getElementById('sp-mount').innerHTML = '<div class="alert alert-red">Failed to load staff information</div>'; });
  }

  window.addEventListener('DOMContentLoaded', load);
})();