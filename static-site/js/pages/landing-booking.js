/* ================================================================== */
/*  Critical Shot — landing booking form + AI mount                    */
/* ================================================================== */
(function () {
  'use strict';
  const CS = window.CS;

  const inputCls = 'input';
  const labelCls = 'field__label';
  const SERVICES = [
    'Photography', 'Videography', 'Photography + Videography', 'Wedding',
    'Event Coverage', 'Corporate / Commercial', 'Drone', 'Other'
  ];

  function fieldGrid() {
    return '<div class="form-2col">' + arguments[0] + '</div>';
  }

  function sheetsBackendEndpoint() {
    var cfg = (window.CRITICAL_AI_CONFIG || {}).config || {};
    return (cfg.sheetsEndpoint || '').trim();
  }

  /* Production backend → Google Sheets. Mirrors the assistant's submission:
     success is only reported after the web app confirms the row was stored. */
  function submitToSheets(payload) {
    var endpoint = sheetsBackendEndpoint();
    if (!endpoint) return Promise.resolve({ ok: false, skipped: true });
    return fetch(endpoint, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'appendBooking', booking: payload })
    }).then(function (res) {
      return res.text().then(function (txt) {
        var json = null;
        try { json = JSON.parse(txt); } catch (e) { json = null; }
        if (json && json.ok === true) {
          return { ok: true, reference: json.bookingId || json.reference || payload.bookingId };
        }
        if (json && json.ok === false && json.duplicate === true) {
          return { ok: true, reference: json.bookingId || payload.bookingId, duplicate: true };
        }
        return { ok: false, safe: true };
      }).catch(function () { return { ok: false, safe: true }; });
    }).catch(function () { return { ok: false, safe: true }; });
  }

  function renderForm(mount) {
    const nameF = '<div class="field"><label class="' + labelCls + '">Name</label><input class="' + inputCls + '" id="bk-name" type="text" placeholder="Your full name" autocomplete="name"></div>';
    const phoneF = '<div class="field"><label class="' + labelCls + '">Phone</label><input class="' + inputCls + '" id="bk-phone" type="tel" placeholder="+232 ..." autocomplete="tel"></div>';
    const emailF = '<div class="field"><label class="' + labelCls + '">Email</label><input class="' + inputCls + '" id="bk-email" type="email" placeholder="you@example.com" autocomplete="email"></div>';
    const serviceF = '<div class="field"><label class="' + labelCls + '">Service</label><select class="' + inputCls + '" id="bk-service">' +
      SERVICES.map(function (s) { return '<option>' + CS.esc(s) + '</option>'; }).join('') +
      '</select></div>';
    const dateF = '<div class="field"><label class="' + labelCls + '">Date</label><input class="' + inputCls + '" id="bk-date" type="date"></div>';
    const locF = '<div class="field"><label class="' + labelCls + '">Location</label><input class="' + inputCls + '" id="bk-location" type="text" placeholder="Freetown, Sierra Leone"></div>';
    const msgF = '<div class="field col-span-2"><label class="' + labelCls + '">Message</label><textarea class="' + inputCls + '" id="bk-message" rows="4" placeholder="Tell us about your event, your vision, or anything else..."></textarea></div>';

    mount.innerHTML =
      '<form id="booking-form-el" novalidate class="form-2col" style="gap:0 1.25rem">' +
        nameF + phoneF + emailF + serviceF + dateF + locF + msgF +
        '<div class="col-span-2" id="bk-error" role="alert" style="display:none;font-size:.875rem;color:var(--shot-soft);margin-bottom:1rem"></div>' +
        '<div class="col-span-2"><button type="submit" id="bk-submit" class="btn btn-primary btn-lg btn-block">SEND BOOKING REQUEST</button></div>' +
      '</form>';

    const formEl = mount.querySelector('#booking-form-el');
    const errorEl = mount.querySelector('#bk-error');
    const submitBtn = mount.querySelector('#bk-submit');
    const endpoint = sheetsBackendEndpoint();
    let leadConversationId = null;

    formEl.addEventListener('submit', function (e) {
      e.preventDefault();
      errorEl.style.display = 'none';
      const name = mount.querySelector('#bk-name').value.trim();
      const phone = mount.querySelector('#bk-phone').value.trim();
      const email = mount.querySelector('#bk-email').value.trim();
      const eventDate = mount.querySelector('#bk-date').value;
      const location = mount.querySelector('#bk-location').value.trim();

      let invalid = '';
      if (!name) invalid = 'Please enter your name.';
      else if (!phone) invalid = 'Please enter your phone number.';
      else if (!/^[A-Za-z0-9+_.-]+@(.+)$/.test(email)) invalid = 'Please enter a valid email address.';
      else if (!eventDate) invalid = 'Please choose an event date.';
      else if (!location) invalid = 'Please enter a location.';

      if (invalid) {
        errorEl.textContent = invalid;
        errorEl.style.display = 'block';
        return;
      }

      if (!leadConversationId) {
        leadConversationId = 'lead-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
      }

      const payload = {
        name: name, phone: phone, email: email,
        service: mount.querySelector('#bk-service').value,
        eventDate: eventDate, location: location,
        requirements: mount.querySelector('#bk-message').value.trim(),
        status: 'New', conversationId: leadConversationId, source: 'landing-form'
      };

      function showError(msg) {
        errorEl.textContent = msg || 'Something went wrong. Please try again.';
        errorEl.style.display = 'block';
      }
      function resetBtn() {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'SEND BOOKING REQUEST';
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner"></span> SENDING...';

      const localP = CS.api.post('/api/customer-leads', payload);
      if (!endpoint) {
        /* Standalone mode: record in the local studio log and confirm. */
        localP.then(function (data) {
          renderSuccess(mount, data);
        }).catch(function (err) {
          showError(err && err.message || '');
        }).then(resetBtn);
        return;
      }

      /* Production: the Google Sheets backend must confirm the row was
         stored before we claim the request was received. */
      localP.catch(function () { }).then(function () {
        return submitToSheets(payload);
      }).then(function (sheet) {
        if (!sheet.ok) {
          showError('Your booking request could not be stored right now. Please try again shortly.');
          return;
        }
        leadConversationId = null;
        renderSuccess(mount, {
          message: 'Your request has been received. The Critical Shot team will review your details and contact you.',
          reference: sheet.reference
        });
      }).then(resetBtn);
    });
  }

  function renderSuccess(mount, data) {
    mount.innerHTML =
      '<div style="display:flex;flex-direction:column;align-items:center;padding:1.5rem 0;text-align:center">' +
        '<span style="display:flex;height:4rem;width:4rem;align-items:center;justify-content:center;border-radius:9999px;background:rgba(52,211,153,.15);color:#34d399">' + CS.icon('check', 'h-8 w-8') + '</span>' +
        '<h3 class="display" style="margin-top:1.5rem;font-size:1.5rem;font-weight:700;color:#fff">Thank you!</h3>' +
        '<p style="margin-top:.75rem;max-width:28rem;line-height:1.6;color:rgba(255,255,255,.6);font-size:.875rem">' +
          (data && data.message
            ? CS.esc(data.message)
            : 'Your request has been received. The Critical Shot team will review your details and contact you.') +
        '</p>' +
        (data && data.reference ? '<p style="margin-top:.5rem;font-size:.75rem;color:rgba(255,255,255,.4)">Reference: ' + CS.esc(data.reference) + '</p>' : '') +
        '<button id="bk-another" class="btn btn-ghost" style="margin-top:2rem">Send another request</button>' +
      '</div>';
    mount.querySelector('#bk-another').addEventListener('click', function () { renderForm(mount); });
  }

  window.addEventListener('DOMContentLoaded', function () {
    const bookingMount = document.getElementById('booking-form');
    if (bookingMount) renderForm(bookingMount);

    const aiMount = document.getElementById('ai-mount');
    if (aiMount && window.CS && typeof CS.Assistant === 'function') {
      new CS.Assistant(aiMount, {
        onBookingDone: function () {
          var b = document.getElementById('booking');
          if (b) b.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }
  });
})();