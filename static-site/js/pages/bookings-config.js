/* ================================================================== */
/*  Critical Shot — booking configuration (admin)                     */
/*  GET/PUT /api/bookings/config                                      */
/* ================================================================== */
(function () {
  'use strict';
  const CS = window.CS;

  const state = {
    maxBookingsPerDay: 3,
    minAdvanceBookingDays: 1,
    maxAdvanceBookingDays: 30,
    cancellationWindowHours: 24,
    rescheduleWindowHours: 24
  };

  function numberInput(name, label, hint) {
    return '<div class="field">' +
      '<label for="cfg-' + name + '">' + label + '</label>' +
      '<input type="number" id="cfg-' + name + '" class="input-lite" min="1" value="' + (state[name] || '') + '">' +
      (hint ? '<p style="margin-top:.3rem;font-size:.75rem;color:#6b7280">' + hint + '</p>' : '') +
    '</div>';
  }

  function render() {
    const mount = document.getElementById('bc-mount');
    mount.innerHTML =
      '<form id="cfg-form">' +
        '<div class="card" style="padding:1.5rem;border:1px solid #e5e7eb;border-radius:.6rem">' +
          '<h2 style="display:flex;align-items:center;gap:.5rem;font-size:1.05rem;font-weight:600;color:#16a34a;margin-bottom:1.25rem">' + CS.icon('calendar', 'h-5 w-5') + ' Booking Limits</h2>' +
          '<div class="form-2col">' +
            numberInput('maxBookingsPerDay', 'Maximum Bookings Per Day', 'Maximum number of bookings allowed per day') +
            numberInput('minAdvanceBookingDays', 'Minimum Advance Booking Days', 'Minimum days in advance for booking') +
            numberInput('maxAdvanceBookingDays', 'Maximum Advance Booking Days', 'Maximum days in advance for booking') +
          '</div>' +
        '</div>' +
        '<div class="card" style="padding:1.5rem;border:1px solid #e5e7eb;border-radius:.6rem;margin-top:1.5rem">' +
          '<h2 style="display:flex;align-items:center;gap:.5rem;font-size:1.05rem;font-weight:600;color:#dc2626;margin-bottom:1.25rem">' + CS.icon('clock', 'h-5 w-5') + ' Cancellation &amp; Rescheduling</h2>' +
          '<div class="form-2col">' +
            numberInput('cancellationWindowHours', 'Cancellation Window (Hours)', 'Hours before booking when cancellation is allowed') +
            numberInput('rescheduleWindowHours', 'Reschedule Window (Hours)', 'Hours before booking when rescheduling is allowed') +
          '</div>' +
        '</div>' +
        '<div class="flex justify-end" style="margin-top:1.5rem">' +
          '<button type="submit" class="btn btn-indigo" style="min-width:13rem" id="cfg-save">Save Configuration</button>' +
        '</div>' +
      '</form>';

    document.getElementById('cfg-form').addEventListener('submit', onSubmit);
  }

  function collect() {
    ['maxBookingsPerDay', 'minAdvanceBookingDays', 'maxAdvanceBookingDays', 'cancellationWindowHours', 'rescheduleWindowHours'].forEach(function (k) {
      const v = Number(document.getElementById('cfg-' + k).value);
      if (!isNaN(v) && v > 0) state[k] = v;
    });
  }

  function onSubmit(e) {
    e.preventDefault();
    collect();
    const btn = document.getElementById('cfg-save');
    btn.disabled = true;
    btn.textContent = 'Saving...';
    CS.api.put('/api/bookings/config', {
      maxBookingsPerDay: state.maxBookingsPerDay,
      minAdvanceBookingDays: state.minAdvanceBookingDays,
      maxAdvanceBookingDays: state.maxAdvanceBookingDays,
      cancellationWindowHours: state.cancellationWindowHours,
      rescheduleWindowHours: state.rescheduleWindowHours
    })
      .then(function () {
        btn.disabled = false;
        btn.textContent = 'Save Configuration';
        CS.toast('Booking configuration updated successfully', 'success');
      })
      .catch(function () {
        btn.disabled = false;
        btn.textContent = 'Save Configuration';
        CS.toast('Error updating booking configuration', 'error');
      });
  }

  function load() {
    if (String(CS.session.role || '').toUpperCase() !== 'ADMIN') {
      window.location.href = 'login.html';
      return;
    }
    CS.renderAdminShell('admin-shell');
    CS.api.get('/api/bookings/config')
      .then(function (data) {
        ['maxBookingsPerDay', 'minAdvanceBookingDays', 'maxAdvanceBookingDays', 'cancellationWindowHours', 'rescheduleWindowHours'].forEach(function (k) {
          if (data && data[k] != null) state[k] = data[k];
        });
        render();
      })
      .catch(function () { render(); });
  }

  window.addEventListener('DOMContentLoaded', load);
})();