/* ================================================================== */
/*  Critical Shot — create booking                                    */
/*  Packages   GET /api/packages                                      */
/*  Config     GET /api/bookings/config                               */
/*  Submit     POST /api/bookings/create (header Userid)              */
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

  const state = {
    packages: [],
    bookingConfig: null,
    email: '',
    phoneNumber: '',
    location: '',
    selectedPackage: '',
    dateTime: '',
    calculatedPrice: 0,
    errors: {}
  };

  function money(n) { return Number(n || 0).toLocaleString(); }

  function render() {
    const mount = document.getElementById('create-mount');
    if (!mount) return;
    const cfg = state.bookingConfig || {};

    mount.innerHTML =
      '<div class="rules-box" style="margin-bottom:1.5rem">' +
        '<h3>Booking Rules</h3>' +
        '<ul>' +
          '<li><span class="ck">' + CS.icon('check', 'h-4 w-4') + '</span>Maximum ' + (cfg.maxBookingsPerDay || 3) + ' bookings allowed per day</li>' +
          '<li><span class="ck">' + CS.icon('check', 'h-4 w-4') + '</span>Bookings must be made at least ' + (cfg.minAdvanceBookingDays || 1) + ' day(s) in advance</li>' +
          '<li><span class="ck">' + CS.icon('check', 'h-4 w-4') + '</span>New bookings must be within ' + (cfg.maxAdvanceBookingDays || 30) + ' days from today</li>' +
          '<li><span class="ck">' + CS.icon('check', 'h-4 w-4') + '</span>Cancellations must be made at least ' + (cfg.cancellationWindowHours || 24) + ' hours before the booking time</li>' +
          '<li><span class="ck">' + CS.icon('check', 'h-4 w-4') + '</span>Rescheduling must be done at least ' + (cfg.rescheduleWindowHours || 24) + ' hours before the current booking time</li>' +
        '</ul>' +
      '</div>' +
      '<form id="create-form" novalidate>' +
        '<div class="form-2col">' +
          field('email', 'Email', 'text', 'you@example.com', { required: true, email: true }) +
          field('phoneNumber', 'Phone Number', 'tel', '123-456-7890', { required: true, phone: true }) +
          '<div class="field">' +
            '<label for="location">Location <span class="req">*</span></label>' +
            '<select id="location" class="input-lite">' +
              '<option value="">Select a location</option>' +
              LOCATIONS.map(function (l) { return '<option value="' + CS.esc(l.name) + '">' + CS.esc(l.name) + '</option>'; }).join('') +
            '</select>' +
            '<p class="err" style="display:none;margin-top:.35rem;font-size:.8rem;color:#dc2626"></p>' +
          '</div>' +
          '<div class="field">' +
            '<label for="selectedPackage">Package <span class="req">*</span></label>' +
            '<select id="selectedPackage" class="input-lite">' +
              '<option value="">Select a package</option>' +
              state.packages.map(function (p) { return '<option value="' + CS.esc(p.name) + '">' + CS.esc(p.name) + '</option>'; }).join('') +
            '</select>' +
            '<p class="err" style="display:none;margin-top:.35rem;font-size:.8rem;color:#dc2626"></p>' +
          '</div>' +
          '<div class="col-span-2" id="pkg-details" style="display:none"></div>' +
          '<div class="col-span-2 field">' +
            '<label for="dateTime">Date &amp; Time <span class="req">*</span></label>' +
            '<input type="datetime-local" id="dateTime" class="input-lite" min="' + new Date().toISOString().slice(0, 16) + '">' +
            '<p class="err" style="display:none;margin-top:.35rem;font-size:.8rem;color:#dc2626"></p>' +
          '</div>' +
        '</div>' +
        '<div id="price-box" style="display:none;margin-top:1rem;padding:1rem 1.25rem;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:.5rem">' +
          '<div class="flex align-center justify-between">' +
            '<span style="color:#166534;font-weight:500">Total Price:</span>' +
            '<span id="price-val" style="color:#14532d;font-weight:700;font-size:1.25rem">Le 0</span>' +
          '</div>' +
          '<p id="price-note" style="margin-top:.35rem;font-size:.8rem;color:#15803d;display:none"></p>' +
        '</div>' +
        '<div class="flex justify-end" style="gap:.75rem;margin-top:1.5rem;padding-top:1.25rem;border-top:1px solid #e5e7eb">' +
          '<a href="bookings.html" class="btn btn-outline">Cancel</a>' +
          '<button type="submit" class="btn btn-indigo" id="create-submit">Create Booking</button>' +
        '</div>' +
      '</form>';

    const form = document.getElementById('create-form');
    form.addEventListener('submit', onSubmit);
    document.getElementById('location').addEventListener('change', onField);
    document.getElementById('selectedPackage').addEventListener('change', onField);
    document.getElementById('dateTime').addEventListener('change', onField);
  }

  function field(id, label, type, placeholder, opts) {
    return '<div class="field">' +
      '<label for="' + id + '">' + label + ' <span class="req">*</span></label>' +
      '<input type="' + type + '" id="' + id + '" class="input-lite" placeholder="' + placeholder + '" autocomplete="off">' +
      '<p class="err" style="display:none;margin-top:.35rem;font-size:.8rem;color:#dc2626"></p>' +
    '</div>';
  }

  function onField() {
    state.email = document.getElementById('email').value;
    state.phoneNumber = document.getElementById('phoneNumber').value;
    state.location = document.getElementById('location').value;
    state.selectedPackage = document.getElementById('selectedPackage').value;
    state.dateTime = document.getElementById('dateTime').value;

    if (state.selectedPackage) {
      const pkg = state.packages.find(function (p) { return p.name === state.selectedPackage; });
      if (pkg) {
        state.calculatedPrice = priceFor(pkg.investment, state.location);
        showPackage(pkg);
      }
    } else {
      document.getElementById('pkg-details').style.display = 'none';
      state.calculatedPrice = 0;
    }
    renderPrice();
    validateField();
  }

  function priceFor(base, loc) {
    const city = LOCATIONS.find(function (l) { return l.name === loc; });
    if (!city) return base;
    return Math.round(base * city.multiplier);
  }

  function showPackage(p) {
    const box = document.getElementById('pkg-details');
    const add = p.additionalItems || {};
    const albums = add.albums || [];
    const framed = add.framedPortraits || [];
    box.style.display = 'block';
    box.innerHTML =
      '<div style="margin-top:1rem;padding:1rem 1.25rem;background:#f9fafb;border:1px solid #e5e7eb;border-radius:.5rem">' +
        '<h3 style="font-size:1rem;font-weight:600;color:#111827;margin-bottom:.75rem">Package Details</h3>' +
        '<div class="flex align-center justify-between" style="margin-bottom:.4rem"><span class="text-gray">Price:</span><span style="font-weight:500;color:#111827">' + 'Le ' + money(p.investment) + '</span></div>' +
        '<div class="flex align-center justify-between" style="margin-bottom:.4rem"><span class="text-gray">Type:</span><span style="font-weight:500;color:#111827">' + CS.esc(p.packageType) + '</span></div>' +
        '<p style="font-size:.85rem;font-weight:500;color:#374151;margin:1rem 0 .4rem">Services Included:</p>' +
        '<ul style="list-style:disc;padding-left:1.25rem;display:flex;flex-direction:column;gap:.25rem;color:#4b5563;font-size:.875rem">' +
          (p.servicesIncluded || []).map(function (s) { return '<li>' + CS.esc(s) + '</li>'; }).join('') +
        '</ul>' +
        '<p style="font-size:.85rem;font-weight:500;color:#374151;margin:1rem 0 .4rem">Additional Items:</p>' +
        '<div style="display:flex;flex-direction:column;gap:.3rem;font-size:.875rem">' +
          '<div class="flex align-center justify-between"><span class="text-gray">Edited Images:</span><span style="font-weight:500;color:#111827">' + add.editedImages + '</span></div>' +
          '<div class="flex align-center justify-between"><span class="text-gray">Unedited Images:</span><span style="font-weight:500;color:#111827">' + add.uneditedImages + '</span></div>' +
          (albums.length ? '<div style="margin-top:.5rem"><span class="text-gray">Albums:</span><ul style="list-style:disc;padding-left:1.25rem;margin-top:.25rem;color:#4b5563">' + albums.map(function (a) { return '<li>' + CS.esc(a.size) + ' ' + CS.esc(a.type) + ' (Spread Count: ' + (a.spreadCount || 0) + ')</li>'; }).join('') + '</ul></div>' : '') +
          (framed.length ? '<div style="margin-top:.5rem"><span class="text-gray">Framed Portraits:</span><ul style="list-style:disc;padding-left:1.25rem;margin-top:.25rem;color:#4b5563">' + framed.map(function (f) { return '<li>' + CS.esc(f.size) + ' (Quantity: ' + (f.quantity || 0) + ')</li>'; }).join('') + '</ul></div>' : '') +
          (add.thankYouCards ? '<div class="flex align-center justify-between" style="margin-top:.5rem"><span class="text-gray">Thank You Cards:</span><span style="font-weight:500;color:#111827">' + add.thankYouCards + '</span></div>' : '') +
        '</div>' +
      '</div>';
  }

  function renderPrice() {
    const box = document.getElementById('price-box');
    if (state.calculatedPrice > 0) {
      box.style.display = 'block';
      document.getElementById('price-val').textContent = 'Le ' + state.calculatedPrice.toLocaleString();
      const note = document.getElementById('price-note');
      if (state.location && state.selectedPackage) {
        note.style.display = 'block';
        note.textContent = 'Price includes location adjustment for ' + state.location;
      } else {
        note.style.display = 'none';
      }
    } else {
      box.style.display = 'none';
    }
  }

  function setErr(id, msg) {
    const el = document.getElementById(id);
    const errEl = el && el.closest('.field') ? el.closest('.field').querySelector('.err') : null;
    if (errEl) {
      errEl.textContent = msg || '';
      errEl.style.display = msg ? 'block' : 'none';
    }
  }

  function validateField() {
    let ok = true;
    const reEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const rePhone = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;

    if (!state.email) { setErr('email', 'Email is required'); ok = false; }
    else if (!reEmail.test(state.email)) { setErr('email', 'Please enter a valid email address'); ok = false; }
    else setErr('email', '');

    if (!state.phoneNumber) { setErr('phoneNumber', 'Phone number is required'); ok = false; }
    else if (!rePhone.test(state.phoneNumber)) { setErr('phoneNumber', 'Please enter a valid phone number'); ok = false; }
    else setErr('phoneNumber', '');

    if (!state.location) { setErr('location', 'Location is required'); ok = false; }
    else if (state.location.length < 5) { setErr('location', 'Location must be at least 5 characters'); ok = false; }
    else setErr('location', '');

    if (!state.selectedPackage) { setErr('selectedPackage', 'Please select a package'); ok = false; }
    else setErr('selectedPackage', '');

    if (!state.dateTime) { setErr('dateTime', 'Date and time are required'); ok = false; }
    else if (new Date(state.dateTime) < new Date()) { setErr('dateTime', 'Cannot book in the past'); ok = false; }
    else setErr('dateTime', '');

    return ok;
  }

  function onSubmit(e) {
    e.preventDefault();
    state.email = document.getElementById('email').value;
    state.phoneNumber = document.getElementById('phoneNumber').value;
    state.location = document.getElementById('location').value;
    state.selectedPackage = document.getElementById('selectedPackage').value;
    state.dateTime = document.getElementById('dateTime').value;

    if (!validateField()) {
      CS.alert('Please fix all errors before submitting');
      return;
    }
    const uid = CS.session.userId;
    if (!uid) {
      CS.alert('You must be logged in to make a booking');
      window.location.href = 'login.html';
      return;
    }
    const pkg = state.packages.find(function (p) { return p.name === state.selectedPackage; });
    state.calculatedPrice = pkg ? priceFor(pkg.investment, state.location) : 0;

    const btn = document.getElementById('create-submit');
    btn.disabled = true;
    btn.textContent = 'Processing...';

    CS.api.post('/api/bookings/create', {
      email: state.email,
      phoneNumber: state.phoneNumber,
      location: state.location,
      packageName: state.selectedPackage,
      dateTime: state.dateTime,
      clientId: uid,
      price: state.calculatedPrice
    }, { 'Userid': uid })
      .then(function () {
        window.location.href = 'bookings.html?success=true';
      })
      .catch(function (err) {
        btn.disabled = false;
        btn.textContent = 'Create Booking';
        const msg = err.message || 'Failed to create booking';
        if (String(msg).indexOf('Cannot create more than') >= 0) {
          CS.alert(msg);
        } else {
          CS.alert(msg);
        }
      });
  }

  function load() {
    const uid = CS.session.userId;
    if (!uid) { window.location.href = 'login.html'; return; }

    CS.renderHeader('site-header');
    CS.renderFooter('site-footer');

    const pkgQ = CS.api.get('/api/packages').then(function (data) {
      state.packages = Array.isArray(data) ? data : [];
    }).catch(function () {
      state.packages = [];
    });
    const cfgQ = CS.api.get('/api/bookings/config').then(function (data) {
      state.bookingConfig = data || null;
    }).catch(function () { state.bookingConfig = null; });

    Promise.all([pkgQ, cfgQ]).then(function () {
      render();
      const pre = CS.qs('packageName');
      if (pre) {
        const found = state.packages.some(function (p) { return p.name === pre; });
        if (found) {
          document.getElementById('selectedPackage').value = pre;
          onField();
        }
      }
    });
  }

  window.addEventListener('DOMContentLoaded', load);
})();