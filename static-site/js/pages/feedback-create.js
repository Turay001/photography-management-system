/* ================================================================== */
/*  Critical Shot — create feedback (customer)                        */
/*  GET /api/packages, POST /api/feedbacks with Userid header         */
/* ================================================================== */
(function () {
  'use strict';
  const CS = window.CS;

  function render(packages, prefill) {
    const mount = document.getElementById('fcc-mount');
    mount.innerHTML =
      '<div class="card" style="padding:1.75rem">' +
        '<form id="fc-form" novalidate>' +
          '<div class="field"><label>Name <span class="req">*</span></label>' +
            '<input type="text" id="fc-name" class="input-lite" placeholder="Your full name" value="' + CS.esc(prefill.name) + '"></div>' +
          '<div class="field"><label>Email <span class="req">*</span></label>' +
            '<input type="email" id="fc-email" class="input-lite" placeholder="you@example.com" value="' + CS.esc(prefill.email) + '"></div>' +
          '<div class="field"><label>Package <span class="req">*</span></label>' +
            '<select id="fc-pkg" class="input-lite"><option value="">Select a package</option>' +
              packages.map(function (p) { return '<option value="' + CS.esc(p.name) + '">' + CS.esc(p.name) + '</option>'; }).join('') +
            '</select></div>' +
          '<div class="field"><label>Rating</label>' +
            '<input type="range" id="fc-rate" min="1" max="5" step="1" value="5" style="width:100%">' +
            '<div style="display:flex;justify-content:space-between;font-size:.72rem;color:#6b7280"><span>1 ★</span><span>2</span><span>3</span><span>4</span><span>5 ★</span></div>' +
            '<p style="margin:.35rem 0 0;font-size:.85rem;color:#111827;font-weight:600">Current: <span id="fc-rate-val">5 ★</span></p>' +
          '</div>' +
          '<div class="field"><label>Feedback Content <span class="req">*</span></label>' +
            '<textarea id="fc-content" class="input-lite" style="min-height:7rem" maxlength="500" placeholder="Tell us about your experience..."></textarea>' +
            '<p style="margin:.25rem 0 0;font-size:.72rem;color:#6b7280"><span id="fc-count">0</span> / 500</p>' +
          '</div>' +
          '<div id="fc-err"></div>' +
          '<div class="flex justify-end" style="gap:.75rem;margin-top:1.25rem;padding-top:1.25rem;border-top:1px solid #e5e7eb">' +
            '<a href="feedback.html" class="btn btn-outline">Cancel</a>' +
            '<button type="submit" class="btn btn-indigo" id="fc-submit">Submit Feedback</button>' +
          '</div>' +
        '</form>' +
      '</div>';

    document.getElementById('fc-rate').addEventListener('input', function (e) {
      document.getElementById('fc-rate-val').textContent = e.target.value + ' ★';
    });
    document.getElementById('fc-content').addEventListener('input', function (e) {
      document.getElementById('fc-count').textContent = e.target.value.length;
    });
    mount.querySelector('#fc-form').addEventListener('submit', function (e) {
      e.preventDefault();
      setErr('');
      const clientName = document.getElementById('fc-name').value.trim();
      const clientEmail = document.getElementById('fc-email').value.trim();
      const packageName = document.getElementById('fc-pkg').value;
      const rating = Number(document.getElementById('fc-rate').value);
      const content = document.getElementById('fc-content').value.trim();

      if (!clientName) return setErr('Name is required.');
      if (/\d/.test(clientName)) return setErr('Name must not contain numbers.');
      if (!/^\S+@\S+\.\S+$/.test(clientEmail)) return setErr('Please enter a valid email address.');
      if (!packageName) return setErr('Please select a package.');
      if (!content) return setErr('Feedback content is required.');

      const uid = CS.session.userId;
      const btn = document.getElementById('fc-submit');
      btn.disabled = true;
      btn.textContent = 'Submitting...';
      CS.api.post('/api/feedbacks', {
        clientId: uid,
        clientName: clientName,
        clientEmail: clientEmail,
        content: content,
        rating: rating,
        packageName: packageName
      }, { 'Userid': uid })
        .then(function () {
          CS.toast('Feedback submitted successfully', 'success');
          window.location.href = 'feedback.html';
        })
        .catch(function () {
          btn.disabled = false;
          btn.textContent = 'Submit Feedback';
          setErr('Failed to submit feedback. Please try again.');
        });
    });
  }

  function setErr(msg) {
    document.getElementById('fc-err').innerHTML = msg ? '<div class="alert alert-red">' + CS.esc(msg) + '</div>' : '';
  }

  function load() {
    if (!CS.session.isLoggedIn()) { window.location.href = 'login.html'; return; }
    const prefill = { name: '', email: CS.session.email || '' };

    CS.api.get('/api/packages')
      .then(function (data) {
        render(Array.isArray(data) ? data : [], prefill);
      })
      .catch(function () {
        document.getElementById('fcc-mount').innerHTML =
          '<div class="card" style="padding:2.5rem;text-align:center;color:#6b7280">Failed to load packages. Please try again later.</div>';
      });
  }

  window.addEventListener('DOMContentLoaded', load);
})();