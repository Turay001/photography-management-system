/* ================================================================== */
/*  Critical Assistant — premium chat widget (vanilla JS, offline-first) */
/*  Drives the rule-based assistant engine: keyword replies, progressive  */
/*  booking collection, summary + confirm/edit, and submission to the   */
/*  local data layer and (optionally) a Google Sheets web app.          */
/*                                                                     */
/*  Exports on window.CS:                                               */
/*    assistant  -> premium inline / overlay chat                      */
/*    CS.Assistant(mount, opts)                                        */
/*    CS.initAssistantLauncher()  floating "Ask the assistant" button  */
/*    CS.openAssistant() / CS.closeAssistant()                         */
/* ================================================================== */
(function () {
  'use strict';

  const CS = window.CS || (window.CS = {});
  const Engine = window.CriticalAIEngine || null;
  const CFG = window.CRITICAL_AI_CONFIG || {};

  const A = CFG.assistant || {};
  const CNF = CFG.config || {};
  const STORE = CNF.storage || { draft: 'critical_ai_draft_v1', conversation: 'critical_ai_history_v1' };
  const MAXLEN = Number(CNF.maxMessageLength || 500);

  const ASSISTANT_AVATAR =
    '<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Critical Assistant avatar">>' +
      '<circle cx="60" cy="60" r="54" fill="#0b0b0d" stroke="url(#svgai-g)" stroke-width="2.5"/>' +
      '<defs><linearGradient id="svgai-g" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse"><stop stop-color="#ffffff"/><stop offset="1" stop-color="#a1a1aa"/></linearGradient></defs>' +
      '<path d="M26 66 Q26 58 44 58 L76 58 Q94 58 94 66 Z" fill="#ffffff"/>' +
      '<circle cx="60" cy="48" r="26" fill="#7c4a2d"/>' +
      '<ellipse cx="60" cy="26" rx="24" ry="9" fill="#1c1c1c"/>' +
      '<path d="M38 33 Q42 19 54 15 Q70 12 80 18 Q87 23 85 33 Q78 27 70 27 Q60 29 47 33 Z" fill="#1c1c1c"/>' +
      '<circle cx="51" cy="48" r="9" stroke="#0b0b0d" strokeWidth="3" fill="rgba(255,255,255,0.05)"/>' +
      '<circle cx="69" cy="48" r="9" stroke="#0b0b0d" strokeWidth="3" fill="rgba(255,255,255,0.05)"/>' +
      '<circle cx="51" cy="48" r="3" fill="#fff"/><circle cx="51" cy="48" r="1.5" fill="#111"/>' +
      '<circle cx="69" cy="48" r="3" fill="#fff"/><circle cx="69" cy="48" r="1.5" fill="#111"/>' +
      '<path d="M52 63 L68 63 Q70 70 60 71 Q50 70 52 63 Z" fill="#141414"/>' +
      '<path d="M54 82 L60 88 L66 82 L60 78 Z" fill="#fff"/>' +
      '<path d="M22 58 l2.4 6 6 2.4 -6 2.4 -2.4 6 -2.4 -6 -6 -2.4 6 -2.4 Z" fill="#ffffff"/>' +
      '<path d="M98 24 l1.8 4.5 4.5 1.8 -4.5 1.8 -1.8 4.5 -1.8 -4.5 -4.5 -1.8 4.5 -1.8 Z" fill="#a1a1aa"/>' +
    '</svg>';

  const MINI_AVATAR =
    '<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<circle cx="60" cy="60" r="54" fill="#0b0b0d" stroke="#ffffff" strokeWidth="3"/>' +
      '<path d="M26 66 Q26 58 44 58 L76 58 Q94 58 94 66 Z" fill="#ffffff"/>' +
      '<circle cx="60" cy="48" r="26" fill="#7c4a2d"/>' +
      '<ellipse cx="60" cy="26" rx="24" ry="9" fill="#1c1c1c"/>' +
      '<path d="M38 33 Q42 19 54 15 Q70 12 80 18 Q87 23 85 33 Q78 27 70 27 Q60 29 47 33 Z" fill="#1c1c1c"/>' +
      '<circle cx="51" cy="48" r="9" stroke="#0b0b0d" strokeWidth="3" fill="rgba(255,255,255,0.05)"/>' +
      '<circle cx="69" cy="48" r="9" stroke="#0b0b0d" strokeWidth="3" fill="rgba(255,255,255,0.05)"/>' +
      '<circle cx="51" cy="48" r="2.4" fill="#fff"/><circle cx="69" cy="48" r="2.4" fill="#fff"/>' +
      '<path d="M52 63 L68 63 Q70 70 60 71 Q50 70 52 63 Z" fill="#141414"/>' +
      '<path d="M54 82 L60 88 L66 82 L60 78 Z" fill="#fff"/>' +
    '</svg>';

  /* ----------------------------- utils ----------------------------- */
  function now() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  function storage() { try { return window.localStorage; } catch (e) { return null; } }
  function esc(s) { return CS.esc ? CS.esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function fmtMeta(html) {
    const t = String(html == null ? '' : html)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
    return t.split('\n').map(function (line) {
      const m = line.match(/^\s*•\s+(.*)$/);
      if (m) return '<span class="ai-bul">•&nbsp;' + m[1].trim() + '</span>';
      return line || '<br>';
    }).join('<br>');
  }

  function sendSvg() {
    return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>';
  }
  function trashSvg() {
    return '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m4 4v6m4-6v6"/></svg>';
  }
  function closeSvg() {
    return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 18L18 6M6 6l12 12"/></svg>';
  }

  /* "Book a shoot" chip / short phrase → open the booking form card
     instead of the conversational field-by-field flow. */
  function isBookingFormRequest(text) {
    const t = text.trim().toLowerCase();
    return /^(book (a |my )?(shoot|session|booking)|i want to book (a |my )?(photoshoot|shoot|session)|i'?d like to book|let'?s book|book now|book a photoshoot|book a session)$/.test(t);
  }

  /* --------------------------- summary card ------------------------ */
  function summaryCardHtml(s) {
    s = s || {};
    const rows = [
      ['Name', s.name], ['Phone / WhatsApp', s.phone], ['Email', s.email],
      ['Service', s.service], ['Shoot type', s.shootType], ['Date', s.eventDate],
      ['Time', s.time], ['Location', s.location], ['Guests', s.people],
      ['Package', s.packageName], ['Est. price', s.price], ['Notes', s.requirements]
    ].filter(function (r) { return r[1] && String(r[1]).replace(/^—+$/, '') !== '' && String(r[1]).toLowerCase() !== 'n/a'; });

    return '<div class="ai-summary-card">' +
      '<h6 class="ai-summary-title">📋 Booking summary</h6>' +
      rows.map(function (r) {
        return '<div class="ai-summary-row"><span>' + esc(r[0]) + '</span><b>' + esc(r[1]) + '</b></div>';
      }).join('') +
      '<p class="ai-summary-note">Based on starting prices. A final written quote may vary with scope, duration and location — the team will confirm every detail with you.</p>' +
      '<div class="ai-summary-actions">' +
        '<button type="button" class="ai-summ-confirm" data-ai-confirm>Confirm Booking</button>' +
        '<button type="button" class="ai-summ-edit" data-ai-edit>Edit Details</button>' +
      '</div>' +
    '</div>';
  }

  /* --------------------------- booking form card -------------------- */
  function serviceOptions() {
    const svcs = CFG.services || [];
    return svcs.map(function (s) {
      return '<option value="' + esc(s.name) + '">' + esc(s.name) + '</option>';
    }).join('') + '<option value="Other">Other</option>';
  }

  function bookingFormHtml() {
    const label = '<label>';
    return '<div class="ai-form-card">' +
      '<h6 class="ai-form-title">📝 Quick booking form</h6>' +
      '<p class="ai-form-sub">Fill in the details below — we\u2019ll receive your request and confirm availability within 24 hours.</p>' +
      '<div class="ai-form-grid">' +
        label + 'Name *<input class="ai-inp" data-bk="name" type="text" placeholder="Your full name" autocomplete="name"></label>' +
        label + 'Phone / WhatsApp *<input class="ai-inp" data-bk="phone" type="tel" placeholder="+232 ..." autocomplete="tel"></label>' +
        label + 'Email<input class="ai-inp" data-bk="email" type="email" placeholder="you@example.com" autocomplete="email"></label>' +
        label + 'Service *<select class="ai-inp" data-bk="service">' + serviceOptions() + '</select></label>' +
        label + 'Shoot type<input class="ai-inp" data-bk="shootType" type="text" placeholder="e.g. Birthday, Portrait, Wedding"></label>' +
        label + 'Event date *<input class="ai-inp" data-bk="eventDate" type="date"></label>' +
        label + 'Time<input class="ai-inp" data-bk="time" type="text" placeholder="e.g. 4:00 PM or morning"></label>' +
        label + 'Location *<input class="ai-inp" data-bk="location" type="text" placeholder="Town / venue / area"></label>' +
        label + 'People<input class="ai-inp" data-bk="people" type="number" min="1" placeholder="How many?"></label>' +
        label + 'Package<select class="ai-inp" data-bk="packageName"><option value="">No preference</option><option>Standard</option><option>Premium</option><option>Custom</option></select></label>' +
        label + 'Anything else?<textarea class="ai-inp" data-bk="requirements" rows="3" placeholder="Your vision, colours, venue notes…"></textarea></label>' +
      '</div>' +
      '<p class="ai-form-err" data-bk-err style="display:none"></p>' +
      '<div class="ai-form-actions">' +
        '<button type="button" class="ai-summ-confirm" data-ai-bk-submit>Submit Booking Request</button>' +
        '<button type="button" class="ai-summ-edit" data-ai-bk-cancel>Cancel</button>' +
      '</div>' +
    '</div>';
  }

  /* --------------------------- widget ------------------------------ */
  function Assistant(mount, opts) {
    const self = this;
    opts = opts || {};
    this.opts = opts;
    this.overlay = !!opts.overlay;
    this.packages = opts.packages || null;
    this.onBookingDone = opts.onBookingDone || null;
    this.engine = Engine;
    this.session = null;
    this.history = [];
    this._busy = false;
    this._closed = false;

    this.mount = typeof mount === 'string' ? document.querySelector(mount) : mount;

    function greeting() { return A.greeting || "Hi! I'm Critical Assistant — Critical Shot's rule-based helper. How can I help you today?"; }
    function fallback() { return A.fallback || "I don't have that on file right now — the Critical Shot team can help at +232 99 738064."; }

    /* --------------------------- rendering -------------------------- */
    this.build = function () {
      const el = self.mount;
      const wrap = self.overlay ? '' :
        '<div class="ai-inline-head"><span class="eyebrow center-eyebrow">✦ Meet Critical Assistant</span>' +
        '<div><h2 class="display" style="margin-top:.9rem;font-size:1.9rem;line-height:1.15;font-weight:700">CHAT WITH <span class="shot">CRITICAL ASSISTANT</span></h2></div>' +
        '<p style="margin:1rem auto 0;max-width:36rem;line-height:1.6;color:rgba(255,255,255,.55)">Ask about services, prices, packages or delivery — or let the rule-based assistant book your shoot in a friendly chat. No machine learning: every reply comes from predefined answers, keyword matching and our package data.</p></div><div class="ai-inline-pad">';
      const closeBtn = self.overlay ? '<button type="button" class="ai-close" data-ai-close title="Close" aria-label="Close chat">' + closeSvg() + '</button>' : '';
      el.innerHTML =
        wrap +
        '<div class="ai-chat">' +
          '<div class="ai-chat-head">' +
            '<div class="who">' +
              '<span class="ai-head-avatar">' + MINI_AVATAR + '</span>' +
              '<div>' +
                '<h4>' + esc(A.name || 'Critical Assistant') + '</h4>' +
                '<p class="ai-status"><span class="online-dot"></span> Online — replies instantly</p>' +
              '</div>' +
            '</div>' +
            '<div class="ai-head-actions">' +
              '<button type="button" class="ai-clear" data-ai-clear title="Clear conversation" aria-label="Clear conversation">' + trashSvg() + '</button>' +
              closeBtn +
            '</div>' +
          '</div>' +
          '<div class="ai-chat-body chat-scroll ai-chat-body-scope" role="log" aria-live="polite"></div>' +
          '<div class="ai-quick">' +
            '<p class="ai-quick-label">Suggestions</p>' +
            '<div class="ai-chips ai-chips-scope"></div>' +
          '</div>' +
          '<form class="ai-input-row ai-form-scope" novalidate>' +
            '<textarea class="ai-input-scope" rows="1" maxlength="' + MAXLEN + '" placeholder="Ask anything — services, prices, or book a shoot..." aria-label="Message the assistant"></textarea>' +
            '<button type="submit" class="ai-send" title="Send message" aria-label="Send message">' + sendSvg() + '</button>' +
          '</form>' +
        '</div>' +
        (wrap ? '</div>' : '');

      self.body = el.querySelector('.ai-chat-body-scope');
      self.input = el.querySelector('.ai-input-scope');
      self.chips = el.querySelector('.ai-chips-scope');
      self.form = el.querySelector('.ai-form-scope');
      self.typingEl = null;
    };

    /* --------------------------- messages --------------------------- */
    this.scrollBottom = function () { self.body.scrollTop = self.body.scrollHeight; };

    this.setTyping = function (on) {
      if (on) {
        if (self.typingEl) return;
        const row = document.createElement('div');
        row.className = 'msg-row bot typing-row';
        row.innerHTML = '<div class="msg-bubble"><span class="typing"><span></span><span></span><span></span></span></div>';
        self.body.appendChild(row);
        self.typingEl = row;
        self.scrollBottom();
      } else if (self.typingEl) {
        self.typingEl.remove();
        self.typingEl = null;
      }
    };

    this.addMsg = function (role, kind, html, payload) {
      const hist = { role: role, kind: kind || 'text', html: html, ts: now(), payload: payload || null };
      self.history.push(hist);
      self.renderMsg(hist);
      self.save();
      self.scrollBottom();
    };

    this.renderMsg = function (h) {
      const row = document.createElement('div');
      row.className = 'msg-row ' + (h.role === 'user' ? 'user' : 'bot');
      const bubble = document.createElement('div');
      bubble.className = 'msg-bubble' + (h.kind === 'summary' ? ' wide' : '') + (h.kind === 'error' ? ' m-error' : '') + (h.kind === 'success' ? ' m-success' : '');
      bubble.innerHTML = fmtMeta(h.html) + '<span class="t">' + (h.ts || now()) + '</span>';
      row.appendChild(bubble);
      self.body.appendChild(row);
      if (h.kind === 'summary' && h.payload) {
        const card = document.createElement('div');
        card.className = 'ai-summary-scope';
        card.innerHTML = summaryCardHtml(h.payload);
        self.body.appendChild(card);
      }
      if (h.kind === 'error' && h.payload) {
        const retry = document.createElement('div');
        retry.className = 'ai-retry-scope';
        retry.innerHTML = '<button type="button" class="ai-summ-confirm" data-ai-retry>↻ Retry</button>';
        self.body.appendChild(retry);
      }
      if (h.role === 'user') {
        row.setAttribute('aria-label', 'You');
      }
      self.scrollBottom();
    };

    /* transient "submitting" bubble with a spinner — never persisted */
    this.setLoading = function (on) {
      if (on) {
        if (self.loadingEl || self._closed) return;
        const row = document.createElement('div');
        row.className = 'msg-row bot';
        row.innerHTML = '<div class="msg-bubble m-loading"><span class="ai-spin"></span> Submitting your booking request…</div>';
        self.body.appendChild(row);
        self.loadingEl = row;
        self.scrollBottom();
      } else if (self.loadingEl) {
        self.loadingEl.remove();
        self.loadingEl = null;
      }
    };

    this.pushBot = function (html, cb) {
      if (self._closed) return cb && cb();
      self.setTyping(true);
      const delay = 520 + Math.random() * 420;
      setTimeout(function () {
        if (self._closed) { if (cb) cb(); return; }
        self.setTyping(false);
        self.addMsg('bot', 'text', html);
        if (cb) cb();
      }, delay);
    };

    /* --------------------------- persistence ------------------------ */
    this.save = function () {
      const s = storage(); if (!s) return;
      try {
        if (self.history.length) s.setItem(STORE.conversation, JSON.stringify(self.history));
        else s.removeItem(STORE.conversation);
        if (self.session) s.setItem(STORE.draft, JSON.stringify(self.session));
      } catch (e) { /* storage full/blocked — ignore */ }
    };

    this.clearDraft = function () {
      const s = storage(); if (!s) return;
      try { s.removeItem(STORE.draft); } catch (e) { /* ignore */ }
    };

    this.restore = function () {
      const s = storage(); if (!s) return;
      try {
        const hist = s.getItem(STORE.conversation);
        const draft = s.getItem(STORE.draft);
        if (hist) {
          const arr = JSON.parse(hist);
          if (Array.isArray(arr) && arr.length) {
            self.history = arr;
            arr.forEach(function (h) { self.renderMsg(h); });
          }
        }
        if (draft) {
          const d = JSON.parse(draft);
          if (d && typeof d === 'object') {
            self.session = d;
            if (d.mode && d.mode !== 'idle' && self.history.length === 0) {
              self.addMsg('bot', 'text', 'I found your saved booking draft — let\'s continue where we left off. ' + draftResumeMsg(d));
            }
          }
        }
      } catch (e) { self.history = []; self.session = null; }
      self.scrollBottom();
    };

    function draftResumeMsg(d) {
      const remaining = Engine ? Engine.missingFields(d.data || {}).length : 0;
      if (d.mode === 'confirming') return 'Your booking summary is still on screen — confirm it or tell me what to change.';
      return (remaining ? 'Just a couple more details: ' : '') + (remaining === 0 ? '' : 'we need ' + remaining + ' more detail' + (remaining > 1 ? 's' : '') + ' to finish. Continue when ready!');
    }

    this.cmdClear = function () {
      const s = storage(); if (!s) return;
      self.history = [];
      self.session = null;
      self.body.innerHTML = '';
      try { s.removeItem(STORE.conversation); s.removeItem(STORE.draft); } catch (e) { /* ignore */ }
      self.addMsg('bot', 'text', greeting());
    };

    /* --------------------------- conversation ----------------------- */
    this.send = function (raw) {
      const text = String(raw == null ? '' : raw).trim();
      if (!text || self._busy) return;
      if (!self.engine) { self.pushBot(fallback()); return; }
      if (isBookingFormRequest(text)) { self.openBookingForm(text); return; }
      self._busy = true;
      self.addMsg('user', 'text', text);

      const res = self.engine.reply(text, self.session);
      self.session = res && res.session ? res.session : self.session;
      self.save();

      if (res && res.action === 'submit') { self.doSubmit(); return; }

      const replyHtml = (res && res.reply) || fallback();
      self.setTyping(true);
      const delay = 520 + Math.random() * 420;
      setTimeout(function () {
        self.setTyping(false);
        if (res && res.render === 'summary' && res.summary) {
          self.addMsg('bot', 'summary', replyHtml, res.summary);
        } else {
          self.addMsg('bot', 'text', replyHtml);
        }
        self._busy = false;
      }, delay);
    };

    this.runSubmit = function (session) {
      if (!self.engine || !session) { self._busy = false; self.setTyping(false); return Promise.resolve(null); }
      self._busy = true;
      self.setTyping(false);
      self.setLoading(true);
      return self.engine.submit(session).then(function (result) {
        self.setLoading(false);
        if (!result) { self._busy = false; return null; }
        if (result.ok) {
          const ref = result.reference || (result.payload && result.payload.bookingId) || 'CS-' + new Date().getTime().toString(36).toUpperCase();
          const configured = !!((CFG.config || {}).sheetsEndpoint || '').trim();
          self.addMsg('bot', 'success',
            '✅ **Your booking request has been successfully received.**\n\n' +
            'Our team will review the details and contact you to confirm availability.\n\n' +
            'Reference: **' + esc(ref) + '**' +
            (configured
              ? ''
              : '\n\n(Recorded in the studio log — connect Google Sheets to route new bookings into your own sheet.)') +
            '\n\nAnything else I can help you with?');
          self.clearDraft();
          self.session = self.engine.blank();
          self.save();
          if (self.onBookingDone) self.onBookingDone(result.payload || result);
          self._busy = false;
          return result;
        }
        if (result.retryLater) {
          self.addMsg('bot', 'text', result.message || 'Please try again in a moment — your draft is safe.');
          self._busy = false;
          return result;
        }
        self.addMsg('bot', 'error',
          'Hmm, I couldn\u2019t send your booking request just now 😟\n\nYour details are safe and **nothing has been submitted**. Press **Retry** below, or reach the team directly at **+232 99 738064** and they\u2019ll capture it for you.',
          { session: self.session });
        self._busy = false;
        return result;
      }).catch(function () {
        self.setLoading(false);
        self.addMsg('bot', 'error', 'Something went wrong on my end 😟 Your details are safe and **nothing has been submitted** — press **Retry** or call **+232 99 738064**.', { session: self.session });
        self._busy = false;
        return null;
      });
    };

    this.doSubmit = function () {
      return self.runSubmit(self.session);
    };

    this.retry = function () {
      if (!self.session) return;
      self.doSubmit();
    };

    /* ------------------------ booking form -------------------------- */
    this.removeFormCards = function () {
      Array.prototype.forEach.call(self.body.querySelectorAll('.ai-form-card'), function (c) { c.remove(); });
    };

    this.openBookingForm = function (text) {
      if (self._busy) return;
      self._busy = true;
      self.session = self.engine.blank();
      self.addMsg('user', 'text', text);
      self.save();
      self.setTyping(true);
      const delay = 520 + Math.random() * 420;
      setTimeout(function () {
        self.setTyping(false);
        if (self._closed) { self._busy = false; return; }
        self.removeFormCards();
        self.addMsg('bot', 'text',
          'Sure! 📝 Fill in the quick form below and I\u2019ll submit your booking request to the studio the moment you press **Submit Booking Request**. Prefer to chat instead? Just tell me your details in the message box.');
        self.renderBookingForm();
        self._busy = false;
      }, delay);
    };

    this.renderBookingForm = function () {
      const card = document.createElement('div');
      card.className = 'ai-form-card';
      card.innerHTML = bookingFormHtml();
      self.body.appendChild(card);
      self.scrollBottom();
    };

    this.submitBookingForm = function (btn) {
      if (self._busy) return;
      const card = btn && btn.closest ? btn.closest('.ai-form-card') : null;
      if (!card) return;
      const val = function (k) {
        const el = card.querySelector('[data-bk="' + k + '"]');
        return el ? el.value.trim() : '';
      };
      const data = {
        name: val('name'), phone: val('phone'), email: val('email'),
        service: val('service'), shootType: val('shootType'),
        eventDate: val('eventDate'), time: val('time'), location: val('location'),
        people: val('people'), packageName: val('packageName'), requirements: val('requirements')
      };
      const errEl = card.querySelector('[data-bk-err]');
      const invalid = [];
      if (!data.name) invalid.push('your name');
      if (!data.phone) invalid.push('your phone number');
      if (!data.eventDate) invalid.push('the event date');
      if (!data.location) invalid.push('a location');
      if (data.email && !/^[a-z0-9+_.%-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(data.email)) invalid.push('a valid email');
      if (invalid.length) {
        errEl.textContent = 'Please provide ' + invalid.join(', ') + '.';
        errEl.style.display = 'block';
        return;
      }
      errEl.style.display = 'none';
      const session = self.session || (self.engine && self.engine.blank());
      session.mode = 'collecting';
      session.data = data;
      session.answered = session.answered || [];
      self.session = session;
      self.save();
      self.runSubmit(session).then(function (result) {
        if (result && result.ok) self.removeFormCards();
      });
    };

    this.cancelBookingForm = function (btn) {
      const card = btn && btn.closest ? btn.closest('.ai-form-card') : null;
      if (card) card.remove();
      if (self.session) { self.session = self.engine.blank(); self.save(); }
      self.addMsg('bot', 'text', 'No problem — let me know if you\u2019d like to book later or need anything else. 😊');
    };

    /* --------------------------- suggestions ------------------------ */
    this.renderChips = function () {
      const src = (self.history.length || (self.session && self.session.mode !== 'idle'))
        ? (A.quickSuggestions || [])
        : (A.suggestedPrompts || A.quickSuggestions || []);
      if (!src.length) return;
      self.chips.innerHTML = src.map(function (q) {
        return '<button type="button" class="ai-chip" data-q="' + esc(q) + '"><span class="ai-chip-arr">↗</span> ' + esc(q) + '</button>';
      }).join('');
      Array.prototype.forEach.call(self.chips.querySelectorAll('.ai-chip'), function (c) {
        c.addEventListener('click', function () { if (!self._busy) self.send(c.dataset.q); });
      });
    };

    /* --------------------------- bindings --------------------------- */
    function fitInput() {
      self.input.style.height = 'auto';
      self.input.style.height = Math.min(self.input.scrollHeight, 140) + 'px';
    }

    this.bind = function () {
      self.form.addEventListener('submit', function (e) { e.preventDefault(); self.send(self.input.value); self.input.value = ''; fitInput(); });
      self.input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          self.send(self.input.value);
          self.input.value = '';
          fitInput();
        }
        fitInput();
      });
      self.input.addEventListener('input', fitInput);

      const clear = self.mount.querySelector('[data-ai-clear]');
      if (clear) clear.addEventListener('click', function () { if (!self._busy) self.cmdClear(); });

      self.body.addEventListener('click', function (e) {
        const t = e.target.closest('[data-ai-confirm],[data-ai-edit],[data-ai-retry],[data-ai-bk-submit],[data-ai-bk-cancel]');
        if (!t) return;
        if (t.hasAttribute('data-ai-confirm')) self.send('confirm');
        else if (t.hasAttribute('data-ai-edit')) self.send('edit');
        else if (t.hasAttribute('data-ai-retry')) self.retry();
        else if (t.hasAttribute('data-ai-bk-submit')) self.submitBookingForm(t);
        else if (t.hasAttribute('data-ai-bk-cancel')) self.cancelBookingForm(t);
      });
    };

    /* ------------------------------ init ---------------------------- */
    this.init = function () {
      if (!self.mount) return;
      self.build();
      self.bind();
      self.restore();
      if (!self.history.length) {
        self.session = Engine ? Engine.blank() : null;
        self.pushBot(greeting(), function () { self.renderChips(); });
      } else {
        self.renderChips();
        self.scrollBottom();
      }
      if (opts.autoFocus) { self.input.focus(); }
    };

    this.init();
  }
  CS.Assistant = Assistant;

  /* --------------------------- overlay ------------------------------ */
  function ensureOverlay() {
    let ov = document.getElementById('ai-overlay');
    if (ov) return ov;
    ov = document.createElement('div');
    ov.id = 'ai-overlay';
    ov.className = 'ai-overlay';
    ov.setAttribute('hidden', '');
    ov.innerHTML =
      '<div class="ai-overlay-backdrop" data-ai-close></div>' +
      '<div class="ai-overlay-panel" role="dialog" aria-modal="true" aria-label="Chat with Critical Assistant"></div>';
    document.body.appendChild(ov);
    return ov;
  }

  CS.openAssistant = function () {
    if (!Engine) { CS.toast && CS.toast('Assistant is loading…', 'success'); return; }
    const ov = ensureOverlay();
    const panel = ov.querySelector('.ai-overlay-panel');
    if (!ov._assistant) ov._assistant = new Assistant(panel, { overlay: true, autoFocus: true });
    ov.removeAttribute('hidden');
    ov.classList.add('open');
    setTimeout(function () {
      const inp = panel.querySelector('.ai-input-scope');
      if (inp) inp.focus();
    }, 60);
    if (document.body) document.body.style.overflow = 'hidden';
  };

  CS.closeAssistant = function () {
    const ov = document.getElementById('ai-overlay');
    if (!ov) return;
    ov.classList.remove('open');
    setTimeout(function () { ov.setAttribute('hidden', ''); }, 220);
    if (document.body) document.body.style.overflow = '';
  };

  CS.initAssistantLauncher = function () {
    if (!CFG.config || CFG.config.launcher === false) return;
    if (document.getElementById('ai-launcher')) return;
    if (document.getElementById('ai-mount')) return;
    if (location.search.indexOf('no-ai') >= 0) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.id = 'ai-launcher';
    b.className = 'ai-launcher';
    b.setAttribute('aria-label', 'Ask the assistant');
    b.innerHTML =
      '<span class="ai-launcher-avatar">' + MINI_AVATAR + '</span>' +
      '<span class="ai-launcher-label"><span class="ai-launcher-lab">Ask</span> <b>' + esc(A.name || 'Critical Assistant') + '</b></span>' +
      '<span class="ai-launcher-hint">?</span>';
    b.addEventListener('click', function () { CS.openAssistant(); });
    document.body.appendChild(b);
  };

  /* ----------------------- global delegation ------------------------ */
  document.addEventListener('click', function (e) {
    const opener = e.target.closest && e.target.closest('[data-open-ai]');
    if (opener) {
      e.preventDefault();
      CS.openAssistant();
      return;
    }
    const closer = e.target.closest && e.target.closest('[data-ai-close]');
    if (closer) {
      e.preventDefault();
      if (closer.id === 'ai-overlay' || closer.classList.contains('ai-overlay-backdrop')) { CS.closeAssistant(); return; }
      e.stopPropagation();
      CS.closeAssistant();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { CS.closeAssistant(); }
  });

  /* Auto-launcher on pages that load this file statically and have no
     inline #ai-mount widget. Dynamically-loaded pages are initialised by
     core.js calling CS.initAssistantLauncher() after ensureAILibs(). */
  if (!document.getElementById('ai-mount')) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { CS.initAssistantLauncher(); });
    } else {
      CS.initAssistantLauncher();
    }
  }
})();