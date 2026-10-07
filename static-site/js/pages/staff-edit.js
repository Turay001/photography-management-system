/* ================================================================== */
/*  Critical Shot — update staff member (admin)                       */
/*  GET /api/staff/:id, PUT /api/staff/:id (full object)              */
/* ================================================================== */
(function () {
  'use strict';
  const CS = window.CS;

  const id = CS.qs('id');
  let staff = null;

  function datePart(v) { return v ? String(v).split('T')[0] : ''; }

  function render() {
    const f = staff;
    document.getElementById('se-mount').innerHTML =
      '<div class="card" style="padding:1.5rem 1.75rem 2rem">' +
        '<div class="field"><label>Name: <span class="req">*</span></label><input type="text" id="se-name" class="input-lite" value="' + CS.esc(f.name || '') + '"></div>' +
        '<div class="field"><label>Email: <span class="req">*</span></label><input type="email" id="se-email" class="input-lite" value="' + CS.esc(f.email || '') + '"></div>' +
        '<div class="field"><label>Phone: <span class="req">*</span></label><input type="text" id="se-phone" class="input-lite" value="' + CS.esc(f.phone || '') + '"></div>' +
        '<div class="field"><label>Address: <span class="req">*</span></label><input type="text" id="se-address" class="input-lite" value="' + CS.esc(f.address || '') + '"></div>' +
        '<div class="field"><label>Experience: <span class="req">*</span></label><input type="text" id="se-experience" class="input-lite" placeholder="e.g. 5" value="' + CS.esc(f.experience || '') + '"></div>' +
        '<div class="field"><label>Hourly Rate (Le/hour): <span class="req">*</span></label><input type="number" id="se-rate" class="input-lite" min="0" value="' + (f.hourlyRate == null ? '' : f.hourlyRate) + '"></div>' +
        '<div class="field"><label>Specialization: <span class="req">*</span></label><input type="text" id="se-spec" class="input-lite" value="' + CS.esc(f.specialization || '') + '"></div>' +
        '<div class="field"><label>Availability:</label>' +
          '<select id="se-avail" class="input-lite"><option value="true"' + (f.availability ? ' selected' : '') + '>Available</option><option value="false"' + (!f.availability ? ' selected' : '') + '>Busy</option></select>' +
        '</div>' +
        '<label style="font-size:.82rem;font-weight:600;color:#111827">Availability Range</label>' +
        '<div class="form-2col" style="margin-top:.35rem">' +
          '<div class="field"><label style="font-size:.75rem;color:#6b7280">From</label><input type="date" id="se-from" class="input-lite" value="' + CS.esc(datePart(f.availabilityStartDate)) + '"></div>' +
          '<div class="field"><label style="font-size:.75rem;color:#6b7280">To</label><input type="date" id="se-to" class="input-lite" value="' + CS.esc(datePart(f.availabilityEndDate)) + '"></div>' +
        '</div>' +
        '<div id="se-err"></div>' +
        '<div class="flex justify-end" style="gap:.75rem;margin-top:1.25rem;padding-top:1.25rem;border-top:1px solid #e5e7eb">' +
          '<a href="staff.html" class="btn btn-outline">Cancel</a>' +
          '<button type="button" class="btn btn-indigo" id="se-submit">Update Staff</button>' +
        '</div>' +
      '</div>';

    document.getElementById('se-submit').addEventListener('click', submit);
  }

  function submit() {
    setErr('');
    const name = document.getElementById('se-name').value.trim();
    const email = document.getElementById('se-email').value.trim();
    const phone = document.getElementById('se-phone').value.trim();
    const address = document.getElementById('se-address').value.trim();
    const experience = document.getElementById('se-experience').value.trim();
    const hourlyRate = Number(document.getElementById('se-rate').value);
    const specialization = document.getElementById('se-spec').value.trim();
    const availability = document.getElementById('se-avail').value === 'true';
    const availabilityStartDate = document.getElementById('se-from').value;
    const availabilityEndDate = document.getElementById('se-to').value;

    if (!name) return setErr('Name is required.');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr('Please enter a valid email address.');
    if (!/^\d{10}$/.test(phone)) return setErr('Phone number must be exactly 10 digits.');
    if (!address) return setErr('Address is required.');
    if (!experience) return setErr('Experience is required.');
    if (!(hourlyRate > 0)) return setErr('Hourly rate must be a positive number.');
    if (!specialization) return setErr('Specialization is required.');

    const payload = Object.assign({}, staff, {
      name: name,
      email: email,
      phone: phone,
      address: address,
      experience: experience,
      hourlyRate: hourlyRate,
      specialization: specialization,
      availability: availability,
      availabilityStartDate: availabilityStartDate,
      availabilityEndDate: availabilityEndDate
    });

    const btn = document.getElementById('se-submit');
    btn.disabled = true;
    btn.textContent = 'Updating...';
    CS.api.put('/api/staff/' + encodeURIComponent(id), payload)
      .then(function () {
        CS.toast('Staff updated successfully!', 'success');
        window.location.href = 'staff.html';
      })
      .catch(function () {
        btn.disabled = false;
        btn.textContent = 'Update Staff';
        setErr('Failed to update staff.');
      });
  }

  function setErr(msg) {
    document.getElementById('se-err').innerHTML = msg ? '<div class="alert alert-red">' + CS.esc(msg) + '</div>' : '';
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
        if (!data || !data.id) { document.getElementById('se-mount').innerHTML = '<div class="alert alert-red">Staff not found</div>'; return; }
        staff = data;
        render();
      })
      .catch(function () { document.getElementById('se-mount').innerHTML = '<div class="alert alert-red">Failed to load staff details</div>'; });
  }

  window.addEventListener('DOMContentLoaded', load);
})();