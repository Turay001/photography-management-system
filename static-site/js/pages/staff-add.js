/* ================================================================== */
/*  Critical Shot — add staff member (admin)                          */
/*  POST /api/staff (also creates a User with role staff)             */
/* ================================================================== */
(function () {
  'use strict';
  const CS = window.CS;

  function todayStr() { return new Date().toISOString().split('T')[0]; }

  function render() {
    const mount = document.getElementById('sa-mount');
    mount.innerHTML =
      '<form id="sa-form" class="card" style="padding:1.5rem 1.75rem 2rem" novalidate>' +
        '<div class="field"><label>Your Name: <span class="req">*</span></label><input type="text" id="sa-name" class="input-lite" placeholder="e.g. Kasun Perera"></div>' +
        '<div class="field"><label>Email Address: <span class="req">*</span></label><input type="email" id="sa-email" class="input-lite" placeholder="name@example.com"></div>' +
        '<div class="field"><label>Phone: <span class="req">*</span></label><input type="text" id="sa-phone" class="input-lite" placeholder="07XXXXXXXX"></div>' +
        '<div class="field"><label>Address: <span class="req">*</span></label><input type="text" id="sa-address" class="input-lite"></div>' +
        '<div class="field"><label>Experience: <span class="req">*</span></label><input type="text" id="sa-experience" class="input-lite" placeholder="e.g. 5"></div>' +
        '<div class="field"><label>Hourly Rate: <span class="req">*</span></label><input type="number" id="sa-rate" class="input-lite" min="0" placeholder="in Le"></div>' +
        '<div class="field"><label>Specialization: <span class="req">*</span></label>' +
          '<select id="sa-spec" class="input-lite"><option value="">Select Specialization</option><option>Wedding</option><option>Portraits</option><option>Events</option></select>' +
        '</div>' +
        '<div class="field"><label>Availability: <span class="req">*</span></label>' +
          '<select id="sa-avail" class="input-lite"><option value="true" selected>Available</option><option value="false">Busy</option></select>' +
        '</div>' +
        '<label style="font-size:.82rem;font-weight:600;color:#111827">Availability Range</label>' +
        '<div class="form-2col" style="margin-top:.35rem">' +
          '<div class="field"><label style="font-size:.75rem;color:#6b7280">From</label><input type="date" id="sa-from" class="input-lite" value="' + todayStr() + '"></div>' +
          '<div class="field"><label style="font-size:.75rem;color:#6b7280">To</label><input type="date" id="sa-to" class="input-lite" value="' + todayStr() + '"></div>' +
        '</div>' +
        '<div class="field"><label>Password: <span class="req">*</span></label><input type="password" id="sa-password" class="input-lite" minlength="6" placeholder="Minimum 6 characters"></div>' +
        '<div id="sa-err"></div>' +
        '<div class="flex justify-end" style="gap:.75rem;margin-top:1.25rem;padding-top:1.25rem;border-top:1px solid #e5e7eb">' +
          '<a href="staff.html" class="btn btn-outline">Cancel</a>' +
          '<button type="submit" class="btn btn-indigo" id="sa-submit">Add Staff</button>' +
        '</div>' +
      '</form>';

    mount.querySelector('#sa-form').addEventListener('submit', function (e) {
      e.preventDefault();
      setErr('');
      const name = document.getElementById('sa-name').value.trim();
      const email = document.getElementById('sa-email').value.trim();
      const phone = document.getElementById('sa-phone').value.trim();
      const address = document.getElementById('sa-address').value.trim();
      const experience = document.getElementById('sa-experience').value.trim();
      const hourlyRate = Number(document.getElementById('sa-rate').value);
      const specialization = document.getElementById('sa-spec').value;
      const availability = document.getElementById('sa-avail').value === 'true';
      const availabilityStartDate = document.getElementById('sa-from').value;
      const availabilityEndDate = document.getElementById('sa-to').value;
      const password = document.getElementById('sa-password').value;

      if (!name) return setErr('Name is required.');
      if (!/^\S+@\S+\.\S+$/.test(email)) return setErr('Please enter a valid email address.');
      if (!/^\d{10}$/.test(phone)) return setErr('Phone number must be exactly 10 digits.');
      if (!address) return setErr('Address is required.');
      if (!experience) return setErr('Experience is required.');
      if (!(hourlyRate > 0)) return setErr('Hourly rate must be a positive number.');
      if (!specialization) return setErr('Please select a specialization.');
      if (!password || password.length < 6) return setErr('Password must be at least 6 characters.');

      const payload = {
        name: name,
        email: email,
        phone: phone,
        address: address,
        experience: experience,
        hourlyRate: hourlyRate,
        specialization: specialization,
        availability: availability,
        availabilityStartDate: availabilityStartDate,
        availabilityEndDate: availabilityEndDate,
        password: password
      };

      const btn = document.getElementById('sa-submit');
      btn.disabled = true;
      btn.textContent = 'Adding...';
      CS.api.post('/api/staff', payload)
        .then(function () {
          CS.toast('Staff added successfully!', 'success');
          window.location.href = 'staff.html';
        })
        .catch(function () {
          btn.disabled = false;
          btn.textContent = 'Add Staff';
          setErr('Failed to add staff.');
        });
    });
  }

  function setErr(msg) {
    document.getElementById('sa-err').innerHTML = msg ? '<div class="alert alert-red">' + CS.esc(msg) + '</div>' : '';
  }

  function load() {
    if (String(CS.session.role || '').toUpperCase() !== 'ADMIN') {
      window.location.href = 'login.html';
      return;
    }
    CS.renderAdminShell('admin-shell');
    render();
  }

  window.addEventListener('DOMContentLoaded', load);
})();