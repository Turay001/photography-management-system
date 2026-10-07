/* ================================================================== */
/*  Critical Assistant — rule-based conversation engine (vanilla JS)   */
/*  Deterministic keyword matching + regex extraction + progressive    */
/*  booking collection with a confirm-or-edit summary step.            */
/*  Pure logic: no DOM access, no machine learning, no external AI.    */
/* ================================================================== */
window.CriticalAIEngine = (function () {
  'use strict';

  var CONFIG;
  function cfg() {
    if (!CONFIG) CONFIG = window.CRITICAL_AI_CONFIG || {};
    return CONFIG;
  }
  function money(n) {
    var cur = (cfg().currency || 'Le') + ' ';
    return cur + Number(n || 0).toLocaleString('en-US');
  }
  function low(s) { return String(s == null ? '' : s).trim().toLowerCase(); }
  function has(re, text) { return re.test(low(text)); }

  var weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  var SKIP_WORDS = ['the', 'my', 'our', 'your', 'a', 'an', 'from', 'please', 'would', 'like', 'want', 'studio'];

  /* ============================ DATE / TIME ========================== */
  function parseDateText(raw) {
    var text = low(raw);
    if (!text) return null;
    var now = new Date();
    var d = null;
    var m = null;

    m = text.match(/(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?/);
    if (m) {
      var day = parseInt(m[1], 10), month = parseInt(m[2], 10), year = m[3] ? parseInt(m[3], 10) : now.getFullYear();
      if (month < 1 || month > 12 || day < 1 || day > 31) m = null;
      else { d = new Date(year, month - 1, day); if (d.getDate() !== day) m = null; }
    }
    if (!d && has(/(tomorrow)/, text)) { d = new Date(now); d.setDate(d.getDate() + 1); }
    if (!d && has(/(today)/, text)) { d = new Date(now); }
    if (!d && has(/(this|the)\s*(coming\s*)?weekend|on the weekend/, text)) {
      d = new Date(now);
      while (weekdays[d.getDay()] !== 'saturday') d.setDate(d.getDate() + 1);
    }
    if (!d && !/yesterday|last (week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/.test(text)) {
      var wk = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thurs|thu|thur|fri|sat|sun)\b/.exec(text);
      if (wk && wk[1]) {
        var tgt = resolveDayName(wk[1]);
        if (tgt) {
          var candidate = new Date(now);
          var guard = 0;
          do { candidate.setDate(candidate.getDate() + 1); guard++; }
          while (weekdays[candidate.getDay()] !== tgt && guard < 8);
          if (weekdays[candidate.getDay()] === tgt) d = candidate;
        }
      }
    }
    if (!d) {
      m = text.match(/(?:(\d{1,2})(?:st|nd|rd|th)?\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+(\d{1,2})(?:st|nd|rd|th)?)?/);
      if (m && !/\//.test(text)) {
        var midx = monthOf(m[2]);
        var mday = m[3] ? parseInt(m[3], 10) : (m[1] ? parseInt(m[1], 10) : null);
        if (mday && midx >= 0) {
          d = new Date(now.getFullYear(), midx, mday);
          if (d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
            d = new Date(now.getFullYear() + 1, midx, mday);
          }
        }
      }
    }
    if (!d || isNaN(d.getTime()) || d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) return null;
    return {
      value: pad(d.getFullYear()) + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()),
      display: d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    };
  }
  function monthOf(name) {
    return ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'].indexOf(name);
  }
  function resolveDayName(short) {
    var s = String(short || '').toLowerCase();
    if (s === 'mon' || s === 'monday') return 'monday';
    if (s === 'tue' || s === 'tues' || s === 'tuesday') return 'tuesday';
    if (s === 'wed' || s === 'wednesday') return 'wednesday';
    if (s === 'thu' || s === 'thur' || s === 'thurs' || s === 'thursday') return 'thursday';
    if (s === 'fri' || s === 'friday') return 'friday';
    if (s === 'sat' || s === 'saturday') return 'saturday';
    if (s === 'sun' || s === 'sunday') return 'sunday';
    return null;
  }
  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function parseTimeText(raw) {
    var text = low(raw);
    if (/(morning)/.test(text)) return 'Morning (9 AM – 12 PM)';
    if (/(afternoon)/.test(text)) return 'Afternoon (12 PM – 4 PM)';
    if (/(evening|late)/.test(text)) return 'Evening (4 PM – 7 PM)';
    var m = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|noon)?/);
    if (m && m[1] && parseInt(m[1], 10) <= 12) {
      var h = parseInt(m[1], 10), min = m[2] || '00';
      var suffix = m[3] ? m[3] : (h >= 7 && h <= 12 ? 'am' : 'pm');
      return m[3] === 'noon' ? '12:00 PM' : h + ':' + min + ' ' + suffix.toUpperCase();
    }
    return null;
  }

  /* ============================ EXTRACTION ========================== */
  function extract(raw, into) {
    var text = low(raw);
    var out = into || {};
    var m;

    m = text.match(/(?:my name is|i am|i'm|im|call me|this is)\s+([a-z]+(?:[ .'-][a-z]+){1,3})/);
    if (m) out.name = cleanName(m[1]);

    m = text.match(/\+?[\d][\d\s().-]{6,14}[\d]/);
    if (m) out.phone = m[0].replace(/[^\d+]/g, '');

    m = text.match(/[a-z0-9+_.%-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
    if (m) out.email = m[0];

    var dt = parseDateText(raw);
    if (dt) { out.eventDate = dt.value; out.eventDateDisplay = dt.display; }

    var tm = parseTimeText(raw);
    if (tm) out.time = tm;

    var ppl = text.match(/(\d{1,3})\s*(?:people|persons|guests|pax|of us|of them)/);
    if (ppl) out.people = ppl[1]; else if (/(just me|only me|solo)/.test(text)) out.people = '1';

    var st = detectShootType(raw);
    if (st) { out.shootType = st.name; if (!out.service) out.service = resolveServiceName(st.service); }

    var svc = detectService(raw);
    if (svc && !out.shootType) out.service = svc.name;

    m = text.match(/(?:in|at|near)\s+([a-z][a-z .'.-]{2,40}?)(?=\s*(?:for|on|next|tomorrow|please|thanks|thank|at|call)\b|,|\.|;|$)/);
    if (m && !isStopPhrase(m[1])) out.location = titled(m[1].trim());

    m = text.match(/\b(standard|premium|basic|gold|silver|bronze|platinum|full[- ]day|deluxe)\b/);
    if (m) out.packageName = titled(m[1]);

    if (/(\d{6,10}\s*(?:le|leones)?\s*(?:sle)?)/.test(text) === false) { /* price guesses avoided */ }

    return out;
  }

  function detectShootType(raw) {
    var t = low(raw);
    var m;
    var map = [
      { re: /wedding|nuptial|marriage|traditional|bride|groom|engagement/, name: 'Wedding', service: 'wedding' },
      { re: /birthday|birth day/, name: 'Birthday', service: 'event' },
      { re: /portrait|headshot|head shot|school pictures/, name: 'Portrait', service: 'photography' },
      { re: /studio\s*(session|shoot)?/, name: 'Studio', service: 'photography' },
      { re: /couple|family|maternity|baby|newborn/, name: 'Family / Couple', service: 'photography' },
      { re: /product|menu|item(s)?\s*(shoot)?/, name: 'Product', service: 'corporate' },
      { re: /corporate|business|company|office/, name: 'Corporate', service: 'corporate' },
      { re: /conference|concert|graduation|party|gala|private event/, name: 'Event', service: 'event' },
      { re: /drone|aerial|flyover/, name: 'Drone / Aerial', service: 'drone' },
      { re: /film|video|cinematic|documentary|vlog/, name: 'Videography / Film', service: 'videography' },
      { re: /fashion|editorial|magazine/, name: 'Fashion', service: 'photography' }
    ];
    for (var i = 0; i < map.length; i++) { if (map[i].re.test(t)) return map[i]; }
    return null;
  }

  function detectService(raw) {
    var t = low(raw);
    var svcs = cfg().services || [];
    var best = null, bestScore = 0;
    for (var i = 0; i < svcs.length; i++) {
      var score = 0;
      (svcs[i].keywords || []).forEach(function (k) {
        var re = new RegExp('\\b' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\ /g, '\\s') + '(?:s|ing)?\\b', 'i');
        if (re.test(t)) score++;
        if (t.indexOf(k) >= 0) score++;
      });
      if (score > bestScore) { best = svcs[i]; bestScore = score; }
    }
    return best;
  }

  function titled(s) {
    return String(s || '').replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); });
  }
  function cleanName(s) {
    var stop = ['on', 'at', 'in', 'my', 'the', 'a', 'an', 'please', 'for', 'using', 'and', 'which', 'number', 'is', 'phone', 'call', 'me', 'would', 'can', 'need'];
    var parts = String(s || '').trim().split(/[\s,.'-]+/);
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      var w = parts[i].toLowerCase();
      if (!w) continue;
      if (stop.indexOf(w) >= 0) { if (out.length) break; continue; }
      out.push(parts[i]);
    }
    return titled(out.join(' '));
  }
  function resolveServiceName(idOrName) {
    var v = String(idOrName || '');
    if (!v) return null;
    var svcs = cfg().services || [];
    for (var i = 0; i < svcs.length; i++) {
      if (svcs[i].id === v || svcs[i].name === v) return svcs[i].name;
    }
    return v;
  }
  function isStopPhrase(s) {
    return SKIP_WORDS.indexOf(low(s.trim())) >= 0 || s.trim().length < 2;
  }

  /* ============================ INTENTS ============================== */
  function intent(text) {
    var t = low(text);
    if (/(hello|hi\b|hey|good\s*(morning|afternoon|evening)|salam|howdy|greetings)/.test(t)) return 'greet';
    if (/(how are you|how's it going|how's you|how do you do|you good|whats up|what's up)/.test(t)) return 'howareyou';
    if (/(thank|thanks|thx|appreciate|awesome|great|perfect|you're the best|you are the best)/.test(t)) return 'thanks';
    if (/(bye|goodbye|see you|good night|exit|talk later)/.test(t)) return 'bye';
    if (/(who are you|what can you do|what do you do|help|your capabilities|what are you)\b/.test(t)) return 'capabilities';
    if (/(where are you|your location|where is your studio|are you based|studio located|location of|do you have a studio)/.test(t)) return 'location';
    if (/(contact|reach you|talk to (a |the )?human|speak to|call (you|the studio)|phonenumber|phone number|whatsapp|email (you|us)|your (phone|number|email|contact)|get in touch)/.test(t)) return 'contact';
    if (/(open(ing)? (hours|time)?|when are you (available|open)|your hours|operating hours|available times)/.test(t)) return 'hours';
    if (/(deliver|when (will|do|would) .* (get|receive|see|have) .* (photo|video|pictures|images|album|film)|how (long|quick) .*deliver|delivery (time|timeline|times)|turnaround)/.test(t)) return 'delivery';
    if (/(book|booking|reserve|schedule|availability|available\b|how do i book|ask for a (quote|price)|make a booking)/.test(t)) return 'book';
    if (/(price|pricing|how much|cost|charge|fee|investment|quote|budget|rates|package price|starting price|estimate)/.test(t)) return 'pricing';
    if (/(service|what do you offer|what.*provide|what.*do)/.test(t)) return 'services';
    if (/(payment|deposit|pay\b|paid|installment|bank)/.test(t)) return 'payment';
    if (/(confirm|yes,? (book|submit)|everything (is )?correct|looks good|that's right|that is right|go ahead|proceed|book (it|me)|send it|submit)/.test(t)) return 'confirm';
    if (/(edit|change|correct|update|amend|modify|different)/.test(t)) return 'edit';
    if (/(cancel|forget it|never mind|stop this|reset|start over)/.test(t)) return 'cancel';
    if (/^(no|nope|null)$/.test(t)) return 'no';
    if (/^(yes|yeah|yep|sure|ok|okay)$/.test(t)) return 'yes';
    return 'knowledge';
  }

  /* ============================ ANSWERS ============================== */
  function listServices(svcs) {
    return svcs.map(function (s) {
      return '• **' + s.name + '** — ' + s.startingPriceLabel;
    }).join('\n');
  }
  function pricingInfo(topicService) {
    var svcs = cfg().services || [];
    if (topicService) {
      return 'Here are the starting prices for **' + topicService.name + '**:\n\n' +
        '• ' + topicService.startingPriceLabel +
        (topicService.pricingNote ? '\n\n' + topicService.pricingNote : '') +
        '\n\nEvery project comes with a written quote. Want a tailored estimate for your shoot?';
    }
    return 'Our prices start at:\n\n' + listServices(svcs) +
      '\n\nPrices are starting estimates — final quotes depend on the type of shoot, duration, location and complexity. Want me to estimate your shoot?';
  }

  function buildKnowledgeReply(t, svc) {
    if (/(wedding|bride|groom|marriage|nuptial|traditional)/.test(t)) {
      return 'Weddings are one of our specialties ❤️\n\n• Photography: from Le 5,000\n• Full-day packages: Le 8,000 – Le 12,000\n• Cinematic wedding films: from Le 8,000 (premium Le 15,000 – Le 25,000)\n\n' +
        'Shall I start a booking for your big day?';
    }
    if (/(drone|aerial|flyover)/.test(t)) {
      return 'We fly drones for aerial photography and videography — events, real estate, landscapes and commercial productions — from **Le 3,000**.\n\nWant me to check availability or start a booking?';
    }
    if (/(video|videograph|film|cinematic|documentary|vlog)/.test(t)) {
      return 'Our videography covers 🎥:\n\n• Wedding films: from Le 8,000\n• Event videography: from Le 5,000\n• Corporate video: from Le 10,000\n• Documentaries: from Le 15,000\n• Social media content: from Le 2,000\n\nWant a tailored quote?';
    }
    if (/(event|party|birthday|concert|conference|graduation|gala)/.test(t)) {
      return 'We cover all kinds of events — corporate conferences, concerts, graduations, birthdays and private parties 🎉\n\n• Event coverage: from Le 3,000\n• Corporate events: from Le 5,000\n\nShould I start a booking for you?';
    }
    if (/(portrait|headshot|studio (session|shoot)|couple|family)/.test(t)) {
      return 'Portraits are our bread and butter 📸\n\n• Personal portrait: from Le 800\n• Studio session: from Le 1,500\n• Couple session: from Le 2,000\n\nWant to plan a session?';
    }
    if (/(corporate|business|brand|product|advert|promo)/.test(t)) {
      return 'For businesses and brands 🏢:\n\n• Corporate video: from Le 10,000\n• Product photography & campaigns\n• Social media content packages: monthly from Le 10,000\n\nWant me to start a booking request?';
    }
    if (faqAnswer(t)) return faqAnswer(t);
    return "Here's what I can help you with:\n\n" + capabilities() + "\n\nJust tell me what you're planning and I'll take it from there.";
  }

  function faqAnswer(t) {
    if (/(founder|owner|who runs|who started|ceo)/.test(t)) {
      return 'Critical Shot was founded and is led by **Abdul Rahman Kamara** (Founder & CEO). He leads the company\'s creative direction, production quality and client experience.';
    }
    if (/(tips|what is photography|creative|learn)/.test(t)) {
      return 'Photography is storytelling with light ✨ Great shots come from light, composition, timing and emotion. At Critical Shot we combine technical precision with creative direction to make every frame intentional.';
    }
    return null;
  }

  function capabilities() {
    return '☑ explain our services & packages\n☑ share starting prices\n☑ check where we are, when you can get your photos, and booking policies\n☑ collect your details and book a shoot';
  }

  function knowledgeReply(text) {
    var svc = detectService(text);
    if (/(price|quote|cost|how much|budget|estimate|rates)/.test(low(text))) return pricingInfo(svc);
    if (/(services|offer|provide|photography\b|do you shoot|what (can|could) (you|i)|types)/.test(low(text)) && !svc) {
      return buildKnowledgeReply(text + ' services', null);
    }
    return buildKnowledgeReply(low(text), svc);
  }

  /* ======================== BOOKING STATE ============================ */
  var REQUIRED = ['name', 'phone', 'service', 'eventDate', 'location'];
  var OPTIONAL = ['email', 'shootType', 'time', 'people', 'packageName', 'requirements'];
  var FIELD_ORDER = ['name', 'phone', 'email', 'service', 'shootType', 'eventDate', 'time', 'location', 'people', 'packageName', 'requirements'];

  var QUESTIONS = {
    name: "Great — let's get this booked 🎬. First, what's your full name?",
    phone: "Thanks! What's the best phone or WhatsApp number to reach you on?",
    email: "And an email address so we can send your quote and confirmation? (optional — say 'none' to skip)",
    service: 'Which service do you need? Photography, Videography, Wedding, Event Coverage, Corporate, Drone or Creative Media/Editing?',
    shootType: "What type of shoot is it — for example birthday, portrait, studio, couple, product, corporate or event?",
    eventDate: "When is your event or shoot? (you can say things like 'next Saturday' or '12 June')",
    time: "Do you have a time in mind? (optional — a time, 'morning/afternoon/evening', or 'any')",
    location: 'Where will the shoot take place? A town, venue or area is fine.',
    people: 'How many people should we plan for? (optional — say \'skip\' if it doesn\'t apply)',
    packageName: "Do you have a preferred package — Standard, Premium, or a custom one? (optional — say 'not sure' and I'll quote from your shoot type)",
    requirements: "Anything else we should know about your shoot or vision? (optional — say 'skip' to finish)"
  };

  function blank() {
    return { mode: 'idle', data: {}, conversationId: 'ai-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) };
  }

  function hasVal(v) {
    var s = low(v);
    return v != null && v !== '' && !/(skip|none|n\/a|not sure|any|flexible|no\b)/.test(s);
  }

  function hasBookingSignal(raw) {
    var probe = {};
    extract(raw, probe);
    var count = ['name', 'phone', 'email', 'eventDate', 'time', 'location', 'people', 'shootType', 'service'].filter(function (k) {
      return hasVal(probe[k]);
    }).length;
    if (count >= 2) return true;
    return /\b(shoot|session|coverage|book|wedding|birthday|portrait|photoshoot|photography|videography|package)\b/.test(low(raw));
  }

  function missingFields(data) {
    return FIELD_ORDER.filter(function (f) {
      if (REQUIRED.indexOf(f) >= 0) return !hasVal(data[f]);
      if (OPTIONAL.indexOf(f) < 0) return false;
      return false; /* optional fields only asked when iterating below */
    });
  }

  function nextQuestion(data, prevAsked) {
    var asked = prevAsked || [];
    for (var i = 0; i < FIELD_ORDER.length; i++) {
      var f = FIELD_ORDER[i];
      var optionalHard = OPTIONAL.indexOf(f) >= 0;
      var shouldAsk = optionalHard
        ? asked.indexOf(f) < 0 && !hasVal(data[f])
        : !hasVal(data[f]);
      if (shouldAsk) return f;
      if (optionalHard) asked.push(f);
    }
    return null;
  }

  function askFor(session, field) {
    session.waitingFor = field;
    session.answered = session.answered || [];
    session.answered.push(field);
    return QUESTIONS[field];
  }

  function summaryData(data) {
    var svc = null;
    (cfg().services || []).forEach(function (s) { if (s.name === data.service || s.id === data.service) svc = s; });
    var price = svc ? svc.startingPrice : null;
    (cfg().priceGuide || []).forEach(function (p) {
      if (!price && (data.shootType || '').toLowerCase().indexOf(p.type) >= 0) price = p.price;
    });
    var priceText = price ? money(price) + ' (starting estimate)' : 'To be quoted';
    return {
      name: data.name || '', phone: data.phone || '', email: data.email || '',
      service: data.service || '', shootType: data.shootType || 'General',
      eventDate: data.eventDateDisplay || data.eventDate || '', time: data.time || 'Flexible',
      location: data.location || '', people: data.people || '—',
      packageName: data.packageName || 'To be advised', price: priceText,
      requirements: data.requirements || '—'
    };
  }

  function bookingIntent(session) {
    if (session.mode !== 'idle') return session;
    session.mode = 'collecting';
    session.data = {};
    session.answered = [];
    extract(session.pendingText || '', session.data);
    session.reply = null;
    return session;
  }

  /* ============================ SUBMIT =============================== */
  function clean(s, max) {
    return String(s == null ? '' : s).trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, max || 2000);
  }

  function genBookingId() {
    /* CS-YYYYMMDD-#### — the server re-issues the authoritative sequential
       ID on write; this is just a safe pre-submit reference in the same format. */
    var y = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    var seq = String(Math.floor(Math.random() * 9000) + 1000);
    return 'CS-' + y + '-' + seq;
  }

  function buildPayload(data, conversationId) {
    var nowIso = new Date().toISOString();
    var svc = null;
    (cfg().services || []).forEach(function (s) { if (s.name === data.service || s.id === data.service) svc = s; });
    var requirements = [data.requirements, data.people ? ('Guests: ' + data.people) : ''].filter(Boolean).join(' | ');
    return {
      bookingId: clean(genBookingId(), 20),
      dateSubmitted: nowIso,
      name: clean(data.name, 80),
      phone: clean(data.phone, 20).replace(/[^\d+]/g, ''),
      email: clean(data.email, 120),
      service: clean(data.service, 80),
      shootType: clean(data.shootType, 80),
      eventDate: clean(data.eventDate, 20),
      time: clean(data.time, 40),
      location: clean(data.location, 120),
      packageName: clean(data.packageName || (svc ? svc.name : ''), 80),
      price: clean(data.price ? String(data.price) : (svc ? String(svc.startingPrice) : ''), 60),
      requirements: clean(requirements, 2000),
      status: 'New',
      conversationId: clean(conversationId, 60),
      notes: clean(data.notes, 2000)
    };
  }

  function rowArray(payload) {
    var cols = (cfg().booking || {}).sheetColumns || [];
    var map = {
      'Booking ID': 'bookingId', 'Date Submitted': 'dateSubmitted', 'Customer Name': 'name',
      'Phone/WhatsApp': 'phone', 'Email': 'email', 'Service': 'service', 'Shoot Type': 'shootType',
      'Event Date': 'eventDate', 'Event Time': 'time', 'Location': 'location', 'Package': 'packageName',
      'Price': 'price', 'Requirements': 'requirements', 'Status': 'status',
      'AI Conversation ID': 'conversationId', 'Notes': 'notes'
    };
    return cols.map(function (c) { return payload[map[c]] == null ? '' : String(payload[map[c]]); });
  }

  var lastSubmitTs = 0;
  function rateLimited() {
    var cfgC = (cfg().config || {});
    var limit = Number(cfgC.rateLimitSeconds || 0);
    if (!limit) return false;
    return (Date.now() - lastSubmitTs) < limit * 1000;
  }

  /* Local studio log (standalone data layer). The real production backend
     is the Google Apps Script web app: POST /api/bookings, server-side. */
  function localSubmit(payload) {
    var api = window.CS && window.CS.api;
    if (!api || !api.post) return Promise.resolve({ ok: false, safe: true });
    return api.post('/api/bookings', {
      bookingId: payload.bookingId, dateSubmitted: payload.dateSubmitted,
      name: payload.name, phone: payload.phone, email: payload.email,
      service: payload.service, shootType: payload.shootType, eventDate: payload.eventDate, time: payload.time,
      location: payload.location, package: payload.packageName, price: payload.price,
      requirements: payload.requirements, status: payload.status, conversationId: payload.conversationId,
      notes: payload.notes, source: 'critical-ai'
    }).then(function (json) {
      return { ok: true, reference: (json && json.reference) || payload.bookingId };
    }).catch(function () {
      return { ok: false, safe: true };
    });
  }

  /* Production backend → Google Sheets. Never forwards raw failure text to
     the user; maps everything to a safe boolean so we never claim success
     unless the backend actually persisted the row. */
  function sheetSubmit(payload) {
    var endpoint = ((cfg().config || {}).sheetsEndpoint || '').trim();
    if (!endpoint) return Promise.resolve({ ok: false, skipped: true });
    var body = JSON.stringify({ action: 'appendBooking', row: rowArray(payload), booking: payload });
    return fetch(endpoint, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: body
    }).then(function (res) {
      return res.text().then(function (txt) {
        var json = null;
        try { json = JSON.parse(txt); } catch (e) { json = null; }
        if (json && json.ok === true) {
          return { ok: true, reference: json.bookingId || json.reference || payload.bookingId };
        }
        if (json && json.ok === false && json.duplicate === true) {
          /* Earlier attempt of this same conversation already reached the
             sheet — treat as success (idempotent retry). */
          return { ok: true, reference: json.bookingId || payload.bookingId, duplicate: true };
        }
        if (json && json.ok === false && json.retryLater === true) {
          return { ok: false, safe: true, retryLater: true, message: json.message };
        }
        /* Anything else — validation/backend failure or unreadable reply —
           is never treated as success (we must not claim a booking that the
           backend cannot prove it stored). */
        return { ok: false, safe: true };
      }).catch(function () { return { ok: false, safe: true }; });
    }).catch(function () { return { ok: false, safe: true }; });
  }

  function submit(session) {
    var data = session.data || {};
    var payload = buildPayload(data, session.conversationId);
    payload.data = data;
    var configured = !!((cfg().config || {}).sheetsEndpoint || '').trim();
    if (rateLimited()) {
      var limit = Number((cfg().config || {}).rateLimitSeconds || 20);
      return Promise.resolve({ ok: false, retryLater: true, message: 'Thanks for your patience — we\'re receiving lots of requests right now. Give me about ' + limit + ' seconds and I\'ll happily retry your booking request. 😊 Your draft is safe.', payload: payload });
    }
    /* Local studio-log write is best-effort and never gates the backend. */
    var localP = localSubmit(payload);
    if (!configured) {
      /* Standalone mode: no Google Sheets configured. Record locally and
         say so honestly — no backend claim. */
      return localP.then(function (local) {
        if (!local.ok) return { ok: false, safe: true, payload: payload };
        lastSubmitTs = Date.now();
        return { ok: true, stage: 'local', reference: local.reference || payload.bookingId, payload: payload };
      });
    }
    /* Production path: the backend must persist to Google Sheets before
       we report success to the customer. */
    return localP.then(function () {
      return sheetSubmit(payload).then(function (sheet) {
        if (!sheet.ok) {
          if (sheet.retryLater) {
            return { ok: false, retryLater: true, message: sheet.message || 'Please try again in a moment — your draft is safe.', payload: payload };
          }
          return { ok: false, safe: true, stage: 'sheets', payload: payload };
        }
        lastSubmitTs = Date.now();
        return { ok: true, stage: 'sheets', sheet: sheet, reference: sheet.reference || payload.bookingId, payload: payload };
      });
    });
  }

  /* ======================== MAIN reply() ============================= */
  function reply(raw, session) {
    var text = low(raw);
    session = session || blank();
    var out = { reply: '', render: 'text', action: 'none', session: session, summary: null };

    /* ---------- confirm / edit during a shown summary ---------- */
    if (session.mode === 'confirming') {
      var intentNow = intent(text);
      if (intentNow === 'confirm' || intentNow === 'yes') {
        out.action = 'submit';
        out.reply = "Perfect — submitting your booking request now...";
        return out;
      }
      if (intentNow === 'edit') {
        session.mode = 'editing';
        out.reply = "No problem — tell me what you'd like to change. For example: *\"change the date to next Saturday\"* or *\"my phone is 0765554321\"*.";
        return out;
      }
      if (intentNow === 'cancel') {
        session.mode = 'idle';
        out.reply = "No worries — I've cleared that draft. Happy to start over whenever you're ready!";
        return out;
      }
      /* editing or extra field values while confirming */
      var before = JSON.stringify(session.data);
      extract(raw, session.data);
      var changed = JSON.stringify(session.data) !== before;
      if (changed && session.mode !== 'editing') session.mode = 'editing';
      if (changed) {
        out.session = session;
        out.render = 'summary';
        out.summary = summaryData(session.data);
        out.reply = "Thanks — I've updated the details. Here's the revised summary:";
        return out;
      }
      session.mode = 'confirming';
      out.render = 'summary';
      out.summary = summaryData(session.data);
      out.reply = "I'm still showing the summary for this booking. Is everything correct? You can confirm, or tell me what to change.";
      return out;
    }

    if (session.mode === 'editing') {
      var b2 = JSON.stringify(session.data);
      extract(raw, session.data);
      if (JSON.stringify(session.data) === b2) {
        out.reply = "I didn't catch what to change. You can say something like *\"the date is next Saturday\"* or *\"phone 0765554321\"*. Want me to show the summary again?";
        return out;
      }
      session.mode = 'confirming';
      out.render = 'summary';
      out.summary = summaryData(session.data);
      out.reply = "Done — here's the updated summary. Is everything correct?";
      return out;
    }

    /* ---------- booking collection in progress ---------- */
    if (session.mode === 'collecting') {
      extract(raw, session.data);
      var missing = missingFields(session.data);
      if (missing.length) {
        var f = nextQuestion(session.data, session.answered);
        out.reply = askFor(session, f || 'name');
        return out;
      }
      session.mode = 'confirming';
      session.answered = [];
      out.render = 'summary';
      out.summary = summaryData(session.data);
      out.reply = "I think I have everything I need. Here's your booking summary:";
      return out;
    }

    /* ---------- idle / free conversation ---------- */
    var intentNow = intent(text);
    var bookingSignal = hasBookingSignal(text);
    var startsBooking = intentNow === 'book' ||
      (intentNow === 'yes') ||
      (bookingSignal && ['greet', 'howareyou', 'thanks', 'bye', 'yes', 'no', 'knowledge', 'unknown'].indexOf(intentNow) >= 0);
    if (startsBooking) {
      session.mode = 'collecting';
      session.answered = [];
      extract(raw, session.data);
      var m2 = missingFields(session.data);
      if (m2.length === 0) {
        session.mode = 'confirming';
        out.render = 'summary';
        out.summary = summaryData(session.data);
        out.reply = "Everything is already filled in. Here's your booking summary:";
        return out;
      }
      var f2 = nextQuestion(session.data, session.answered);
      out.reply = 'Happy to help you book a shoot 📅 ' + (QUESTIONS[f2] || QUESTIONS.name);
      return out;
    }

    switch (intentNow) {
      case 'greet':
        out.reply = "Hello, and welcome to Critical Shot 🎬 I'm Critical Assistant — your rule-based booking helper. I can help with services, prices, or collecting a booking. What are you planning?";
        break;
      case 'howareyou':
        out.reply = "Always online and always glad to help 😄 How are you? Tell me about what you're planning to shoot!";
        break;
      case 'thanks':
        out.reply = "You're very welcome! 😊 Anything else — a package, a quote, or booking your shoot with us?";
        break;
      case 'bye':
        out.reply = "Goodbye for now! 👋 Whenever you're ready, I'm here — and the Critical Shot team will capture your story.";
        break;
      case 'capabilities':
        out.reply = "I'm Critical Assistant, Critical Shot's rule-based digital receptionist 🤖 — predefined answers, keyword matching and our package data, nothing more. Here's what I can do:\n\n" + capabilities() + '\n\nTry me: tell me what you\'re planning.';
        break;
      case 'location':
        out.reply = 'Our studio is based in **Freetown, Sierra Leone**. ' + cfg().business.studio.travel + '\n\nWant to book a shoot?';
        break;
      case 'contact':
        out.reply = 'You can reach the Critical Shot team directly 👇\n\n• **Phone / WhatsApp:** +232 99 738064\n• **Email:** kamaraabdulrahman547@gmail.com\n\nOr just tell me what you need and I\'ll help.';
        break;
      case 'hours':
        out.reply = '**Office hours:** ' + cfg().business.hours.office + '.\n**Shoots:** ' + cfg().business.hours.shoot + '\n\nYou can still send a booking request anytime — I never sleep.';
        break;
      case 'delivery':
        out.reply = 'A quick answer on delivery times 📦\n\n• ' + cfg().business.delivery.photos + '\n• ' + cfg().business.delivery.video + '\n\n' + cfg().business.delivery.guarantee;
        break;
      case 'payment':
        out.reply = 'On payment 💳\n\n• ' + cfg().business.payment.quote + '\n• ' + cfg().business.payment.plans + '\n\nI can include payment details in your booking summary.';
        break;
      case 'pricing':
        out.reply = pricingInfo(detectService(raw));
        break;
      case 'services':
        out.reply = 'We offer ' + listServices(cfg().services || []) +
          '\n\nWhich one are you interested in? I can go into detail or start a booking.';
        break;
      case 'edit':
      case 'cancel':
        if (session.mode === 'idle') { out.reply = "No worries — is there anything else I can help you with?"; }
        break;
      default:
        out.reply = knowledgeReply(raw);
    }
    if (!out.reply) out.reply = cfg().assistant.fallback;
    return out;
  }

  /* ======================== PUBLIC API =============================== */
  return {
    reply: reply,
    blank: blank,
    submit: submit,
    buildPayload: buildPayload,
    rowArray: rowArray,
    intent: intent,
    detectService: detectService,
    detectShootType: detectShootType,
    parseDateText: parseDateText,
    missingFields: missingFields,
    summaryData: summaryData,
    isConfigured: function () { return !!((cfg().config || {}).sheetsEndpoint || '').trim(); },
    sheetEndpoint: function () { return (cfg().config || {}).sheetsEndpoint || ''; }
  };
})();