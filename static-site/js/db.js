/* ================================================================== */
/*  Critical Shot PMS — standalone local data layer (localStorage)    */
/*  Replaces the Spring Boot backend so the site runs with no server. */
/*  Exposed as window.CS_MOCK.request(method, url, {headers, body})   */
/* ================================================================== */
(function () {
  'use strict';

  const KEY = 'criticalshot_pms_db_v1';
  const PLACEHOLDER = 'images/album-placeholder.jpg';

  function iso(d) { return d ? d.toISOString() : null; }
  function baseDate(offsetDays, hour) {
    const d = new Date();
    d.setDate(d.getDate() + (offsetDays || 0));
    d.setHours(hour != null ? hour : 10, 0, 0, 0);
    return iso(d);
  }
  function sameDay(a, b) {
    const da = new Date(a), db = new Date(b);
    if (isNaN(da) || isNaN(db)) return false;
    return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
  }
  function daysBetween(a, b) {
    const da = new Date(a), db = new Date(b);
    return Math.round((db - da) / 86400000);
  }

  /* --------------------- password hashing --------------------------- */
  /* Passwords are never stored in plain text — even in the standalone
     demo. Every password is saved as a salted SHA-256 digest in the
     format  sha256$<salt>$<hex>  where <hex> = SHA-256("<salt>:<password>").
     A small pure-JS SHA-256 is used because the Web Crypto API is not
     available from file:// pages in every browser. */
  const HASH_TAG = 'sha256$';

  function rotr(x, n) { return ((x >>> n) | (x << (32 - n))) >>> 0; }

  function sha256(str) {
    const K = new Uint32Array([
      0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
      0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
      0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
      0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
      0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
      0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
      0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
      0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
    ]);
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
      let c = str.charCodeAt(i);
      if (c < 0x80) bytes.push(c);
      else if (c < 0x800) bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
      else if (c < 0xd800 || c >= 0xe000) bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
      else {
        i++;
        const cp = 0x10000 + (((c & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
        bytes.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
      }
    }
    const bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    const hi = Math.floor(bitLen / 0x100000000), lo = bitLen >>> 0;
    bytes.push((hi >>> 24) & 0xff, (hi >>> 16) & 0xff, (hi >>> 8) & 0xff, hi & 0xff,
      (lo >>> 24) & 0xff, (lo >>> 16) & 0xff, (lo >>> 8) & 0xff, lo & 0xff);

    let h = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    const w = new Uint32Array(64);
    for (let off = 0; off < bytes.length; off += 64) {
      for (let i = 0; i < 16; i++) {
        const j = off + i * 4;
        w[i] = ((bytes[j] << 24) | (bytes[j + 1] << 16) | (bytes[j + 2] << 8) | bytes[j + 3]) >>> 0;
      }
      for (let i = 16; i < 64; i++) {
        const s0 = (rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3)) >>> 0;
        const s1 = (rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10)) >>> 0;
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }
      let a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
      for (let i = 0; i < 64; i++) {
        const S1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
        const ch = ((e & f) ^ (~e & g)) >>> 0;
        const t1 = (hh + S1 + ch + K[i] + w[i]) >>> 0;
        const S0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
        const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
        const t2 = (S0 + maj) >>> 0;
        hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      h = [(h[0] + a) >>> 0, (h[1] + b) >>> 0, (h[2] + c) >>> 0, (h[3] + d) >>> 0,
        (h[4] + e) >>> 0, (h[5] + f) >>> 0, (h[6] + g) >>> 0, (h[7] + hh) >>> 0];
    }
    return h.map(function (x) { return ('00000000' + x.toString(16)).slice(-8); }).join('');
  }

  function isHashed(v) { return typeof v === 'string' && v.indexOf(HASH_TAG) === 0; }

  function hashPassword(password, salt) {
    const s = salt || (Date.now().toString(36) + Math.random().toString(36).slice(2, 10)).slice(0, 12);
    return HASH_TAG + s + '$' + sha256(s + ':' + String(password));
  }

  function verifyPassword(password, stored) {
    if (!isHashed(stored)) return false;
    const parts = stored.split('$');
    if (parts.length !== 3) return false;
    const calc = sha256(parts[1] + ':' + String(password));
    if (calc.length !== parts[2].length) return false;
    let diff = 0;                       /* constant-time comparison */
    for (let i = 0; i < calc.length; i++) diff |= calc.charCodeAt(i) ^ parts[2].charCodeAt(i);
    return diff === 0;
  }

  /* --------------------------- seed data --------------------------- */
  function seed() {
    const now = new Date();
    return {
      seq: { staff: 4, package: 5, album: 3, portfolio: 3, booking: 4, feedback: 2, wishlist: 0, lead: 0, activity: 4 },
      config: { maxBookingsPerDay: 3, minAdvanceBookingDays: 1, maxAdvanceBookingDays: 30, cancellationWindowHours: 24, rescheduleWindowHours: 24 },
      users: [
        { id: 'u-admin', name: 'Critical Shot Admin', email: 'admin@criticalshot.com', password: hashPassword('admin123'), role: 'ADMIN', contactNumber: '+232 99 738064', joinDate: iso(now), favorites: [] },
        { id: 'u-staff', name: 'Foday Sesay', email: 'staff@criticalshot.com', password: hashPassword('staff123'), role: 'STAFF', contactNumber: '+232 77 000000', joinDate: iso(now), favorites: [] },
        { id: 'u-cust', name: 'Aminata Jalloh', email: 'customer@criticalshot.com', password: hashPassword('customer123'), role: 'CUSTOMER', contactNumber: '+232 76 000000', joinDate: iso(now), favorites: [1, 2] }
      ],
      staff: [
        { id: 1, name: 'Foday Sesay', email: 'staff@criticalshot.com', phone: '0770000000', address: 'Freetown', experience: '6', hourlyRate: 1500, specialization: 'Wedding', availability: true, availabilityStartDate: '2026-01-01', availabilityEndDate: '2026-12-31' },
        { id: 2, name: 'Marie Koroma', email: 'marie@criticalshot.com', phone: '0771111111', address: 'Bo', experience: '4', hourlyRate: 1200, specialization: 'Portraits', availability: true, availabilityStartDate: '2026-01-01', availabilityEndDate: '2026-12-31' },
        { id: 3, name: 'Ibrahim Turay', email: 'ibrahim@criticalshot.com', phone: '0772222222', address: 'Kenema', experience: '5', hourlyRate: 1350, specialization: 'Events', availability: true, availabilityStartDate: '2026-03-01', availabilityEndDate: '2026-11-30' },
        { id: 4, name: 'Hawa Bangura', email: 'hawa@criticalshot.com', phone: '0773333333', address: 'Makeni', experience: '3', hourlyRate: 1000, specialization: 'Wedding', availability: false, availabilityStartDate: '2026-01-01', availabilityEndDate: '2026-06-30' }
      ],
      packages: [
        {
          id: 1, name: 'Essential Event Package', packageType: 'Event', investment: 80000, image: 'images/imgp.jpg',
          servicesIncluded: ['4 hours coverage', '1 professional photographer', 'Online gallery of edited photos'],
          additionalItems: { editedImages: '50 edited images', uneditedImages: '200 unedited images', thankYouCards: 10, albums: [], framedPortraits: [] }
        },
        {
          id: 2, name: 'Standard Wedding Package', packageType: 'Wedding', investment: 150000, image: 'images/wedding.jpg',
          servicesIncluded: ['8 hours coverage', '2 photographers', 'Pre-wedding consultation', 'Online gallery of edited photos'],
          additionalItems: {
            editedImages: '100 edited images', uneditedImages: '400 unedited images', thankYouCards: 25,
            albums: [{ size: '12x12', type: 'Premium Layflat', spreadCount: 30 }],
            framedPortraits: [{ size: '16x20', quantity: 1 }]
          }
        },
        {
          id: 3, name: 'Premium Wedding Package', packageType: 'Wedding', investment: 250000, image: 'images/portfolo placeholder.jpg',
          servicesIncluded: ['12 hours coverage', '3 photographers', 'Drone photography', 'Same-day edit', 'Cinematic highlight video'],
          additionalItems: {
            editedImages: '200 edited images', uneditedImages: '700 unedited images', thankYouCards: 50,
            albums: [{ size: '12x12', type: 'Premium Layflat', spreadCount: 40 }, { size: '8x8', type: 'Parent Album', spreadCount: 20 }],
            framedPortraits: [{ size: '20x24', quantity: 2 }]
          }
        },
        {
          id: 4, name: 'Commercial Photography', packageType: 'Commercial', investment: 120000, image: 'images/pic.jpg',
          servicesIncluded: ['5 hours on-location shoot', 'Product + lifestyle photography', 'Full commercial license'],
          additionalItems: { editedImages: '75 edited images', uneditedImages: '300 unedited images', thankYouCards: 0, albums: [], framedPortraits: [] }
        },
        {
          id: 5, name: 'Portrait Session', packageType: 'Portrait', investment: 60000, image: 'images/imgp.jpg',
          servicesIncluded: ['2 hours session', 'Studio or outdoor', '3 outfit changes'],
          additionalItems: { editedImages: '25 edited images', uneditedImages: '100 unedited images', thankYouCards: 5, albums: [], framedPortraits: [{ size: '8x12', quantity: 1 }] }
        }
      ],
      albums: [
        { id: 1, name: 'Ibrahim & Kadijatu — Wedding', description: 'A beautiful full-day wedding celebration captured at Lumley Beach, Freetown. From the vows to the final dance.', category: 'wedding', location: 'Freetown', status: 'active', releaseDate: baseDate(-90), coverImage: 'images/wedding.jpg', images: ['images/wedding.jpg', 'images/imgp.jpg', 'images/pic.jpg', 'images/album-placeholder.jpg', 'images/port placeholder.jpg'] },
        { id: 2, name: 'Portrait Session — Aminata', description: 'Studio and golden-hour portraits for Aminata. Soft light, natural tones and timeless poses.', category: 'portrait', location: 'Lumley Beach', status: 'active', releaseDate: baseDate(-50), coverImage: 'images/pic.jpg', images: ['images/pic.jpg', 'images/imgp.jpg', 'images/wedding.jpg'] },
        { id: 3, name: 'Commercial Shoot — Freetown City', description: 'Product and lifestyle photography for a local brand across the streets of Freetown.', category: 'commercial', location: 'Freetown', status: 'active', releaseDate: baseDate(-20), coverImage: 'images/imgp.jpg', images: ['images/imgp.jpg', 'images/pic.jpg', 'images/wedding.jpg'] }
      ],
      portfolio: [
        { id: 1, albumName: 'Ibrahim & Kadijatu — Wedding', description: 'A full day of storytelling for a seaside wedding in Freetown.', photographerName: 'Foday Sesay', category: 'wedding', imageUrl: 'images/wedding.jpg', dateUploaded: baseDate(-90) },
        { id: 2, albumName: 'Portrait Session — Aminata', description: 'Timeless studio portraits with a natural golden-hour touch.', photographerName: 'Marie Koroma', category: 'portrait', imageUrl: 'images/pic.jpg', dateUploaded: baseDate(-50) },
        { id: 3, albumName: 'Commercial Shoot — Freetown City', description: 'Product and lifestyle imagery for a local brand.', photographerName: 'Ibrahim Turay', category: 'commercial', imageUrl: 'images/imgp.jpg', dateUploaded: baseDate(-20) }
      ],
      bookings: [
        { id: 1, clientId: 'u-cust', clientName: 'Aminata Jalloh', email: 'customer@criticalshot.com', phoneNumber: '+232 76 000000', location: 'Lumley Beach', packageName: 'Standard Wedding Package', dateTime: baseDate(3, 10), price: 195000, bookingStatus: 'upcoming', paymentStatus: 'pending', assignedStaffId: 1, assignedStaffName: 'Foday Sesay', createdAt: baseDate(-2) },
        { id: 2, clientId: 'u-cust', clientName: 'Aminata Jalloh', email: 'customer@criticalshot.com', phoneNumber: '+232 76 000000', location: 'Freetown', packageName: 'Portrait Session', dateTime: baseDate(6, 15), price: 60000, bookingStatus: 'upcoming', paymentStatus: 'paid', assignedStaffId: null, assignedStaffName: null, createdAt: baseDate(-1) },
        { id: 3, clientId: 'u-cust', clientName: 'Aminata Jalloh', email: 'customer@criticalshot.com', phoneNumber: '+232 76 000000', location: 'Bo', packageName: 'Essential Event Package', dateTime: baseDate(-30), price: 80000, bookingStatus: 'completed', paymentStatus: 'paid', assignedStaffId: 2, assignedStaffName: 'Marie Koroma', createdAt: baseDate(-40) },
        { id: 4, clientId: 'u-cust', clientName: 'Aminata Jalloh', email: 'customer@criticalshot.com', phoneNumber: '+232 76 000000', location: 'Kenema', packageName: 'Portrait Session', dateTime: baseDate(-10), price: 60000, bookingStatus: 'cancelled', paymentStatus: 'refunded', assignedStaffId: null, assignedStaffName: null, createdAt: baseDate(-15) }
      ],
      feedbacks: [
        { id: 1, clientId: 'u-cust', clientName: 'Aminata Jalloh', clientEmail: 'customer@criticalshot.com', content: 'Absolutely loved the wedding photos. The team was so professional and the final album was stunning!', rating: 5, packageName: 'Standard Wedding Package', createdAt: baseDate(-60), updatedAt: null, active: true, reply: 'Thank you for your positive feedback! We\'re glad you had a great experience with our services.' },
        { id: 2, clientId: 'u-cust', clientName: 'Aminata Jalloh', clientEmail: 'customer@criticalshot.com', content: 'Great portraits, though we would have loved a slightly earlier delivery time.', rating: 4, packageName: 'Portrait Session', createdAt: baseDate(-20), updatedAt: null, active: true, reply: 'Thank you for your positive feedback! We\'re glad you had a great experience with our services.' }
      ],
      wishlist: [],
      leads: [],
      activities: [
        { id: 4, type: 'BOOKING', description: 'Booked \'Standard Wedding Package\'', userName: 'Aminata Jalloh', timestamp: baseDate(-1) },
        { id: 3, type: 'ALBUM', description: 'Created album \'Commercial Shoot — Freetown City\'', userName: 'Critical Shot Admin', timestamp: baseDate(-20) },
        { id: 2, type: 'PORTFOLIO', description: 'Added portfolio item \'Portrait Session — Aminata\'', userName: 'Critical Shot Admin', timestamp: baseDate(-50) },
        { id: 1, type: 'BOOKING', description: 'Completed booking \'Essential Event Package\'', userName: 'Aminata Jalloh', timestamp: baseDate(-30) }
      ]
    };
  }

  /* ------------------------ storage + compaction -------------------- */
  let db = null;
  let memStore = null;

  function load() {
    const raw = readStore();
    if (raw) { db = raw; upgradePasswords(); return; }
    db = seed();
    persist();
  }

  /* One-time migration: any record still holding a plain-text password
     (database created before hashing was added) is re-hashed in place. */
  function upgradePasswords() {
    if (!db || !Array.isArray(db.users)) return;
    let changed = false;
    db.users.forEach(function (u) {
      if (u.password != null && !isHashed(u.password)) {
        u.password = hashPassword(String(u.password));
        changed = true;
      }
    });
    if (changed) persist();
  }

  function readStore() {
    try { return JSON.parse(localStorage.getItem(KEY)); }
    catch (e) { return memStore; }
  }

  function writeStore(obj) {
    try {
      localStorage.setItem(KEY, JSON.stringify(obj));
      memStore = null;
      return true;
    } catch (e) {
      return false;
    }
  }

  function compact(rec) {
    walk(rec);
    return rec;
    function walk(o) {
      if (Array.isArray(o)) { o.forEach(walk); return; }
      if (o && typeof o === 'object') {
        Object.keys(o).forEach(function (k) {
          if (typeof o[k] === 'string' && o[k].indexOf('data:') === 0) o[k] = PLACEHOLDER;
          else walk(o[k]);
        });
      }
    }
  }

  function persist() {
    if (!db) return;
    if (writeStore(db)) return;
    const copy = JSON.parse(JSON.stringify(db));
    compact(copy);
    if (writeStore(copy)) {
      try { localStorage.setItem(KEY + '_c', '1'); } catch (e) { /* ignore */ }
    }
  }

  load();

  /* ------------------------------ utils ----------------------------- */
  function uid(name) {
    db.seq[name] = (db.seq[name] || 0) + 1;
    return db.seq[name];
  }

  function logActivity(type, description, userName) {
    db.activities.push({ id: uid('activity'), type: type, description: description, userName: userName || '', timestamp: iso(new Date()) });
  }

  function fail(msg, status) {
    const e = new Error(msg);
    e.status = status || 400;
    e.data = { message: msg };
    throw e;
  }

  /* ------------------------- authorization -------------------------- */
  /* Every page forwards the signed-in user id in the Userid / userId
     header (attached centrally by js/core.js). The checks below are the
     data-layer half of the security model: even if a page forgets its
     own guard, a protected write still cannot go through. */
  function currentUser(headers) {
    const id = (headers && (headers.Userid || headers.userId)) || '';
    if (!id) return null;
    return userById(id) || null;
  }
  function requireUser(headers) {
    const u = currentUser(headers);
    if (!u) fail('You must be signed in to do that.', 401);
    return u;
  }
  function requireAdmin(headers) {
    const u = requireUser(headers);
    if (String(u.role).toUpperCase() !== 'ADMIN') fail('Administrator access required.', 403);
    return u;
  }
  /* Owner of a record, or an administrator. */
  function ownsOrAdmin(headers, ownerId) {
    const u = requireUser(headers);
    if (String(u.role).toUpperCase() !== 'ADMIN' && String(u.id) !== String(ownerId)) {
      fail('You do not have permission to change this record.', 403);
    }
    return u;
  }
  /* Staff record: administrators, or the signed-in staff member whose
     email matches the record. */
  function staffSelfOrAdmin(headers, staffRecord) {
    const u = requireUser(headers);
    if (String(u.role).toUpperCase() === 'ADMIN') return u;
    if (staffRecord && String(u.email || '').toLowerCase() === String(staffRecord.email || '').toLowerCase()) return u;
    fail('You do not have permission to view or change this record.', 403);
  }
  function minPasswordLen(req) {
    const p = String(req.password == null ? '' : req.password);
    if (p.length < 8) fail('Password must be at least 8 characters.');
    return p;
  }

  function userById(id) {
    return db.users.find(function (u) { return String(u.id) === String(id); });
  }
  function staffById(id) {
    return db.staff.find(function (s) { return String(s.id) === String(id); });
  }
  function packageById(id) {
    return db.packages.find(function (p) { return String(p.id) === String(id); });
  }
  function albumById(id) {
    return db.albums.find(function (a) { return String(a.id) === String(id); });
  }
  function bookingById(id) {
    return db.bookings.find(function (b) { return String(b.id) === String(id); });
  }

  function clientName(user, email) {
    if (user && user.name) return user.name;
    if (email) return email;
    return 'Customer';
  }

  function autoReply(rating) {
    const r = Number(rating) || 0;
    if (r >= 4) return 'Thank you for your positive feedback! We\'re glad you had a great experience with our services.';
    if (r === 3) return 'Thank you for your feedback. We will strive to improve our services to serve you better.';
    return 'We\'re sorry to hear about your experience. We value your feedback and will work to improve.';
  }

  /* ------------------------- booking validation --------------------- */
  function validateBookingDate(dateTime, isReschedule) {
    const cfg = db.config;
    const dt = new Date(dateTime);
    if (isNaN(dt)) fail('Please provide a valid date and time.');

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    if (dt < todayStart) fail('Cannot book in the past.');
    if (isReschedule && daysBetween(new Date(), dt) < 0) fail('Cannot book in the past.');

    if (daysBetween(todayStart, dt) < cfg.minAdvanceBookingDays) {
      fail('Bookings must be made at least ' + cfg.minAdvanceBookingDays + ' day(s) in advance');
    }
    if (daysBetween(todayStart, dt) > cfg.maxAdvanceBookingDays) {
      fail('New bookings must be within ' + cfg.maxAdvanceBookingDays + ' days from today');
    }

    const sameDayCount = db.bookings.filter(function (b) {
      return String(b.bookingStatus).toLowerCase() !== 'cancelled' && sameDay(b.dateTime, dateTime);
    }).length;
    if (sameDayCount >= cfg.maxBookingsPerDay) {
      fail('Cannot create more than ' + cfg.maxBookingsPerDay + ' bookings on the same day. Please choose another date.');
    }
  }

  /* ----------------------------- routing ---------------------------- */
  function query(url) {
    const qi = url.indexOf('?');
    const q = {};
    if (qi >= 0) {
      url.substring(qi + 1).split('&').forEach(function (p) {
        if (!p) return;
        const eq = p.indexOf('=');
        if (eq < 0) { q[decodeURIComponent(p)] = ''; return; }
        q[decodeURIComponent(p.substring(0, eq))] = decodeURIComponent(p.substring(eq + 1));
      });
    }
    return { path: qi >= 0 ? url.substring(0, qi) : url, q: q };
  }

  function bodyOf(body) {
    if (!body) return {};
    if (typeof body === 'string') { try { return JSON.parse(body); } catch (e) { return {}; } }
    return body;
  }

  async function dispatch(method, url, opts) {
    const { path, q } = query(url);
    const headers = opts.headers || {};
    const req = bodyOf(opts.body);
    let m = method.toUpperCase();

    /* ---------------- auth ---------------- */
    if (path === '/api/auth/login' && m === 'POST') {
      const u = db.users.find(function (x) { return String(x.email).toLowerCase() === String(req.email || '').toLowerCase(); });
      const ok = u && (isHashed(u.password)
        ? verifyPassword(req.password, u.password)          /* salted SHA-256 */
        : String(u.password) === String(req.password || '')); /* legacy record */
      if (!ok) fail('Incorrect email or password', 401);
      return { userId: u.id, role: u.role, email: u.email };
    }
    if (path === '/api/auth/register' && m === 'POST') {
      const plain = minPasswordLen(req);
      if (!req.email || !/^[A-Za-z0-9+_.-]+@(.+)$/.test(String(req.email))) fail('Please enter a valid email address.');
      if (db.users.some(function (x) { return String(x.email).toLowerCase() === String(req.email || '').toLowerCase(); })) {
        fail('An account with this email already exists');
      }
      const u = { id: 'u' + Date.now(), name: req.name || req.email, email: req.email, password: hashPassword(plain), role: 'CUSTOMER', contactNumber: req.contactNumber || '', joinDate: iso(new Date()), favorites: [] };
      db.users.push(u);
      persist();
      return { userId: u.id, role: u.role, email: u.email };
    }

    let gm = path.match(/^\/api\/auth\/profile\/([^/]+)$/);
    if (gm) {
      const u = userById(gm[1]);
      if (!u) fail('Profile not found', 404);
      ownsOrAdmin(headers, u.id);
      if (m === 'GET') return { id: u.id, role: u.role, name: u.name, email: u.email, contactNumber: u.contactNumber || 'Not provided', joinDate: u.joinDate };
      if (m === 'PUT') {
        if (req.name) u.name = req.name;
        if (req.email) u.email = req.email;
        if (req.contactNumber !== undefined) u.contactNumber = req.contactNumber;
        persist();
        return { id: u.id, role: u.role, name: u.name, email: u.email, contactNumber: u.contactNumber || 'Not provided', joinDate: u.joinDate };
      }
    }

    /* ---------------- dashboard ---------------- */
    if (path === '/api/dashboard/stats' && m === 'GET') {
      requireAdmin(headers);
      return {
        totalBookings: db.bookings.length,
        pendingBookings: db.bookings.filter(function (b) { return String(b.bookingStatus).toLowerCase() === 'upcoming'; }).length,
        totalAlbums: db.albums.length,
        totalStaff: db.staff.length,
        totalPackages: db.packages.length,
        totalPortfolioItems: db.portfolio.length
      };
    }
    if (path === '/api/dashboard/recent-activities' && m === 'GET') {
      requireAdmin(headers);
      return db.activities.slice().sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); }).slice(0, 8);
    }

    /* ---------------- booking config ---------------- */
    if (path === '/api/bookings/config' && m === 'GET') return db.config;
    if (path === '/api/bookings/config' && m === 'PUT') {
      requireAdmin(headers);
      Object.keys(db.config).forEach(function (k) { if (req[k] != null) db.config[k] = Number(req[k]); });
      persist();
      return db.config;
    }

    /* ---------------- admin bookings ---------------- */
    if (path === '/admin/bookings' && m === 'GET') {
      requireAdmin(headers);
      return db.bookings.slice().sort(function (a, b) { return new Date(b.dateTime) - new Date(a.dateTime); });
    }
    let bm = path.match(/^\/admin\/bookings\/([^/]+)$/);
    if (bm) {
      requireAdmin(headers);
      const b = bookingById(bm[1]);
      if (!b) fail('Booking not found', 404);
      if (m === 'GET') return b;
      if (m === 'PUT') {
        if (req.dateTime) {
          const newDate = new Date(req.dateTime);
          if (isNaN(newDate)) fail('Please provide a valid date and time.');
          if (newDate <= new Date()) fail('Booking date must be in the future');
          b.dateTime = req.dateTime;
        }
        if (req.bookingStatus) b.bookingStatus = req.bookingStatus;
        if (req.paymentStatus) b.paymentStatus = req.paymentStatus;
        if (req.location) b.location = req.location;
        if (req.packageName) b.packageName = req.packageName;
        if (req.email) b.email = req.email;
        if (req.phoneNumber) b.phoneNumber = req.phoneNumber;
        persist();
        return b;
      }
      if (m === 'DELETE') {
        db.bookings = db.bookings.filter(function (x) { return String(x.id) !== String(b.id); });
        persist();
        return null;
      }
    }

    /* ---------------- client bookings ---------------- */
    if (path === '/api/bookings/client' && m === 'GET') {
      const me = requireUser(headers);
      return db.bookings.filter(function (b) { return String(b.clientId) === String(me.id); })
        .slice().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    }
    if (path === '/api/bookings/create' && m === 'POST') {
      if (!req.email || !req.phoneNumber || !req.location || !req.packageName || !req.dateTime) {
        fail('Email, phone, location, package and date/time are required.');
      }
      validateBookingDate(req.dateTime);
      const client = requireUser(headers);
      const b = {
        id: uid('booking'),
        clientId: client.id,
        clientName: clientName(client, req.email),
        email: req.email,
        phoneNumber: req.phoneNumber,
        location: req.location,
        packageName: req.packageName,
        dateTime: req.dateTime,
        price: Number(req.price || 0),
        bookingStatus: 'upcoming',
        paymentStatus: 'pending',
        assignedStaffId: null,
        assignedStaffName: null,
        createdAt: iso(new Date())
      };
      db.bookings.push(b);
      logActivity('BOOKING', 'Booked \'' + req.packageName + '\'', clientName(client, req.email));
      persist();
      return b;
    }
    let rm = path.match(/^\/api\/bookings\/reschedule\/([^/]+)$/);
    if (rm && m === 'PUT') {
      const b = bookingById(rm[1]);
      if (!b) fail('Booking not found', 404);
      ownsOrAdmin(headers, b.clientId);
      if (String(b.bookingStatus).toLowerCase() !== 'upcoming') fail('Only upcoming bookings can be rescheduled.');
      const hoursLeft = (new Date(b.dateTime) - new Date()) / 3600000;
      if (hoursLeft < db.config.rescheduleWindowHours) {
        fail('Rescheduling must be done at least ' + db.config.rescheduleWindowHours + ' hours before the current booking time');
      }
      validateBookingDate(req.dateTime);
      b.dateTime = req.dateTime;
      persist();
      return b;
    }
    let cm = path.match(/^\/api\/bookings\/cancel\/([^/]+)$/);
    if (cm && m === 'PATCH') {
      const b = bookingById(cm[1]);
      if (!b) fail('Booking not found', 404);
      ownsOrAdmin(headers, b.clientId);
      const hoursLeft = (new Date(b.dateTime) - new Date()) / 3600000;
      if (hoursLeft < db.config.cancellationWindowHours) {
        fail('Cancellations must be made at least ' + db.config.cancellationWindowHours + ' hours before the booking time');
      }
      b.bookingStatus = 'cancelled';
      persist();
      return b;
    }
    gm = path.match(/^\/api\/bookings\/staff\/([^/]+)$/);
    if (gm && m === 'GET') {
      staffSelfOrAdmin(headers, staffById(gm[1]));
      return db.bookings.filter(function (b) { return String(b.assignedStaffId) === String(gm[1]); })
        .slice().sort(function (a, b) { return new Date(b.dateTime) - new Date(a.dateTime); });
    }
    gm = path.match(/^\/api\/bookings\/([^/]+)\/assign$/);
    if (gm && m === 'PUT') {
      requireAdmin(headers);
      const b = bookingById(gm[1]);
      const s = staffById(req.staffId);
      if (!b) fail('Booking not found', 404);
      if (!s) fail('Staff not found', 404);
      b.assignedStaffId = s.id;
      b.assignedStaffName = s.name;
      persist();
      return b;
    }

    /* ---------------- staff assignment ---------------- */
    gm = path.match(/^\/api\/staff\/assign\/([^/]+)$/);
    if (gm && m === 'PUT') {
      requireAdmin(headers);
      const s = staffById(gm[1]);
      const b = bookingById(req.bookingId);
      if (!s) fail('Staff not found', 404);
      if (!b) fail('Booking not found', 404);
      b.assignedStaffId = s.id;
      b.assignedStaffName = s.name;
      persist();
      return b;
    }

    /* ---------------- staff ---------------- */
    if (path === '/api/staff/search') {
      requireUser(headers);
      const s = db.staff.find(function (x) { return String(x.email).toLowerCase() === String(q.email || '').toLowerCase(); });
      return s ? Object.assign({}, s) : null;
    }
    if (path === '/api/staff' && m === 'GET') { requireAdmin(headers); return db.staff.slice(); }
    if (path === '/api/staff' && m === 'POST') {
      requireAdmin(headers);
      if (req.password != null && String(req.password).length < 8) fail('Password must be at least 8 characters.');
      if (db.staff.some(function (s) { return String(s.email).toLowerCase() === String(req.email || '').toLowerCase(); })) {
        fail('A staff member with this email already exists');
      }
      const s = {
        id: uid('staff'),
        name: req.name, email: req.email, phone: req.phone, address: req.address,
        experience: String(req.experience || ''), hourlyRate: Number(req.hourlyRate || 0),
        specialization: req.specialization,
        availability: !!(req.availability === true || req.availability === 'true'),
        availabilityStartDate: req.availabilityStartDate || '', availabilityEndDate: req.availabilityEndDate || ''
      };
      db.staff.push(s);
      if (!db.users.some(function (u) { return String(u.email || '').toLowerCase() === String(req.email || '').toLowerCase(); })) {
        db.users.push({ id: 'u' + Date.now(), name: req.name, email: req.email, password: hashPassword(req.password || 'staff123'), role: 'STAFF', contactNumber: req.phone || '', joinDate: iso(new Date()), favorites: [] });
      }
      persist();
      return s;
    }
    gm = path.match(/^\/api\/staff\/([^/]+)$/);
    if (gm) {
      const s = staffById(gm[1]);
      if (!s) fail('Staff not found', 404);
      if (m === 'GET') { staffSelfOrAdmin(headers, s); return Object.assign({}, s); }
      if (m === 'PUT') {
        staffSelfOrAdmin(headers, s);
        const keys = ['name', 'email', 'phone', 'address', 'experience', 'hourlyRate', 'specialization', 'availability', 'availabilityStartDate', 'availabilityEndDate', 'specialization'];
        keys.forEach(function (k) { if (req[k] !== undefined) s[k] = req[k]; });
        if (req.availability !== undefined) s.availability = !!(req.availability === true || req.availability === 'true');
        const link = db.users.find(function (u) { return String(u.email || '').toLowerCase() === String(s.email).toLowerCase(); });
        if (link) {
          if (req.password) {
            if (String(req.password).length < 8) fail('Password must be at least 8 characters.');
            link.password = hashPassword(req.password);
          }
          if (req.name) link.name = s.name;
        }
        persist();
        return Object.assign({}, s);
      }
      if (m === 'DELETE') {
        requireAdmin(headers);
        db.staff = db.staff.filter(function (x) { return String(x.id) !== String(s.id); });
        const link = db.users.find(function (u) { return String(u.email || '').toLowerCase() === String(s.email).toLowerCase(); });
        if (link) db.users = db.users.filter(function (u) { return u !== link; });
        persist();
        return null;
      }
    }

    /* ---------------- packages ---------------- */
    if (path === '/api/packages' && m === 'GET') return db.packages.slice();
    if (path === '/api/packages' && m === 'POST') {
      requireAdmin(headers);
      const p = Object.assign({ id: uid('package') }, normalizePackage(req));
      db.packages.push(p);
      persist();
      return p;
    }
    let pm = path.match(/^\/api\/packages\/([^/]+)$/);
    if (pm) {
      const p = packageById(pm[1]);
      if (!p) fail('Package not found', 404);
      if (m === 'GET') return Object.assign({}, p);
      if (m === 'PUT') {
        requireAdmin(headers);
        const norm = normalizePackage(req);
        Object.keys(norm).forEach(function (k) { p[k] = norm[k]; });
        persist();
        return p;
      }
      if (m === 'DELETE') {
        requireAdmin(headers);
        db.packages = db.packages.filter(function (x) { return String(x.id) !== String(p.id); });
        persist();
        return null;
      }
    }

    /* ---------------- albums + favorites ---------------- */
    if (path === '/api/albums' && m === 'GET') return db.albums.slice();
    if (path === '/api/albums' && m === 'POST') {
      requireAdmin(headers);
      const imgs = toArray(req.images);
      if (!req.name || !req.description || !req.category || !req.location) fail('Name, description, category and location are required.');
      if (!req.coverImage && !imgs.length) fail('Please provide at least one image and a cover image.');
      const a = {
        id: uid('album'),
        name: req.name, description: req.description, category: req.category, location: req.location,
        status: req.status || 'active', releaseDate: iso(new Date()),
        coverImage: req.coverImage || imgs[0] || PLACEHOLDER,
        images: imgs.length ? imgs : [PLACEHOLDER]
      };
      db.albums.push(a);
      logActivity('ALBUM', 'Created album \'' + a.name + '\'', 'Critical Shot Admin');
      persist();
      return a;
    }
    let am = path.match(/^\/api\/albums\/([^/]+)$/);
    if (am && (/^\/api\/albums\//).test(path)) {
      const a = albumById(am[1]);
      if (!a) fail('Album not found', 404);
      if (m === 'GET') return Object.assign({}, a);
      if (m === 'PUT') {
        requireAdmin(headers);
        if (req.name !== undefined) a.name = req.name;
        if (req.description !== undefined) a.description = req.description;
        if (req.category !== undefined) a.category = req.category;
        if (req.location !== undefined) a.location = req.location;
        if (req.status !== undefined) a.status = req.status;
        if (req.coverImage) a.coverImage = req.coverImage;
        const imgs = toArray(req.images);
        if (imgs.length) a.images = a.images.concat(imgs);
        persist();
        return a;
      }
      if (m === 'DELETE') {
        requireAdmin(headers);
        db.albums = db.albums.filter(function (x) { return String(x.id) !== String(a.id); });
        db.users.forEach(function (u) { u.favorites = (u.favorites || []).filter(function (f) { return String(f) !== String(a.id); }); });
        persist();
        return null;
      }
    }

    let fg = path.match(/^\/api\/users\/([^/]+)\/favorites(?:\/([^/]+))?$/);
    if (fg) {
      const u = userById(fg[1]);
      if (!u) fail('User not found', 404);
      ownsOrAdmin(headers, u.id);
      u.favorites = u.favorites || [];
      const albumId = fg[2];
      if (m === 'GET') {
        return u.favorites.map(albumById).filter(Boolean).map(function (a) { return Object.assign({}, a); });
      }
      if (albumId && m === 'POST') {
        const a = albumById(albumId);
        if (!a) fail('Album not found', 404);
        if (u.favorites.indexOf(a.id) < 0) u.favorites.push(a.id);
        persist();
        return { ok: true };
      }
      if (albumId && m === 'DELETE') {
        u.favorites = u.favorites.filter(function (f) { return String(f) !== String(albumId); });
        persist();
        return { ok: true };
      }
      fail('Not found', 404);
    }

    /* ---------------- portfolio ---------------- */
    if (path === '/api/portfolio' && m === 'GET') return db.portfolio.slice();
    if (path === '/api/portfolio' && m === 'POST') {
      requireAdmin(headers);
      if (!req.albumName || !req.description || !req.photographerName || !req.category) fail('All portfolio fields are required.');
      const p = {
        id: uid('portfolio'),
        albumName: req.albumName, description: req.description, photographerName: req.photographerName,
        category: req.category, imageUrl: req.image || PLACEHOLDER, dateUploaded: iso(new Date())
      };
      db.portfolio.push(p);
      logActivity('PORTFOLIO', 'Added portfolio item \'' + p.albumName + '\'', 'Critical Shot Admin');
      persist();
      return p;
    }
    let pom = path.match(/^\/api\/portfolio\/([^/]+)$/);
    if (pom) {
      const p = db.portfolio.find(function (x) { return String(x.id) === String(pom[1]); });
      if (!p) fail('Portfolio item not found', 404);
      if (m === 'GET') return Object.assign({}, p);
      if (m === 'PUT') {
        requireAdmin(headers);
        if (req.albumName !== undefined) p.albumName = req.albumName;
        if (req.description !== undefined) p.description = req.description;
        if (req.photographerName !== undefined) p.photographerName = req.photographerName;
        if (req.category !== undefined) p.category = req.category;
        if (req.image) p.imageUrl = req.image;
        persist();
        return p;
      }
      if (m === 'DELETE') {
        requireAdmin(headers);
        db.portfolio = db.portfolio.filter(function (x) { return String(x.id) !== String(p.id); });
        persist();
        return null;
      }
    }

    /* ---------------- feedback ---------------- */
    if (path === '/api/feedbacks/active' && m === 'GET') {
      const list = db.feedbacks.filter(function (f) { return f.active; });
      return (q.packageName ? list.filter(function (f) { return f.packageName === q.packageName; }) : list)
        .slice().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    }
    if (path === '/api/feedbacks' && m === 'POST') {
      const u = requireUser(headers);
      const hasBooking = db.bookings.some(function (b) { return String(b.clientId) === String(u.id) && String(b.bookingStatus).toLowerCase() !== 'cancelled'; });
      if (!hasBooking) fail('You must book a session before you can leave feedback.');
      const f = {
        id: uid('feedback'),
        clientId: u.id, clientName: req.clientName || u.name, clientEmail: req.clientEmail || u.email,
        content: req.content, rating: Number(req.rating || 5), packageName: req.packageName || '',
        createdAt: iso(new Date()), updatedAt: null, active: true,
        reply: req.content ? autoReply(req.rating) : ''
      };
      db.feedbacks.push(f);
      persist();
      return f;
    }
    gm = path.match(/^\/api\/feedbacks\/([^/]+)$/);
    if (gm) {
      const f = db.feedbacks.find(function (x) { return String(x.id) === String(gm[1]); });
      if (!f) fail('Feedback not found', 404);
      if (m === 'PUT') {
        ownsOrAdmin(headers, f.clientId);
        if (req.content !== undefined) f.content = req.content;
        if (req.rating !== undefined) f.rating = Number(req.rating || 5);
        if (req.packageName !== undefined) f.packageName = req.packageName;
        if (req.clientEmail !== undefined) f.clientEmail = req.clientEmail;
        f.updatedAt = iso(new Date());
        f.reply = autoReply(f.rating);
        persist();
        return f;
      }
      if (m === 'DELETE') {
        ownsOrAdmin(headers, f.clientId);
        f.active = false;
        persist();
        return { ok: true };
      }
    }

    /* ---------------- wishlist ---------------- */
    let wu = path.match(/^\/api\/wishlist\/user\/([^/]+)$/);
    if (wu && m === 'GET') {
      const me = requireUser(headers);
      if (String(wu[1]) !== String(me.id)) fail('You can only view your own wishlist.', 403);
      return db.wishlist.filter(function (w) { return String(w.userId) === String(wu[1]); });
    }
    if (path === '/api/wishlist/add' && m === 'POST') {
      const me = requireUser(headers);
      const list = db.wishlist;
      const dup = list.some(function (w) { return String(w.userId) === String(me.id) && String(w.packageId) === String(req.packageId); });
      if (!dup) {
        list.push({ id: uid('wishlist'), userId: me.id, packageId: req.packageId, packageType: req.packageType || 'standard', packageName: req.packageName || 'Package', price: Number(req.price || 0), imageUrl: req.imageUrl || '' });
      }
      persist();
      return { ok: true };
    }
    if (path === '/api/wishlist/remove' && m === 'DELETE') {
      const me = requireUser(headers);
      db.wishlist = db.wishlist.filter(function (w) {
        return !(String(w.userId) === String(me.id) && String(w.packageId) === String(q.packageId));
      });
      persist();
      return { ok: true };
    }

    /* ---------------- bookings (assistant → backend) ----------------- */
    if ((path === '/api/bookings' || path === '/api/customer-leads') && m === 'POST') {
      const id = uid('lead');
      const today = iso(new Date()).slice(0, 10).replace(/-/g, '');
      const countToday = db.leads.filter(function (l) {
        return String(l.bookingId || '').indexOf('CS-' + today + '-') === 0;
      }).length;
      const bookingId = /^CS-\d{8}-(\d{4})$/.test(req.bookingId || '')
        ? req.bookingId
        : 'CS-' + today + '-' + String(countToday + 1).padStart(4, '0');
      function cap(v, n) { return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, n); }
      db.leads.push({
        id: id,
        bookingId: bookingId,
        name: cap(req.name, 80), phone: cap(req.phone, 20), email: cap(req.email, 120),
        service: cap(req.service, 80), shootType: cap(req.shootType, 80),
        eventDate: cap(req.eventDate, 20), time: cap(req.time, 40),
        location: cap(req.location, 120), package: cap(req.package, 80),
        price: cap(req.price, 60), requirements: cap(req.requirements, 2000),
        status: req.status === 'New' ? 'New' : 'New',
        conversationId: cap(req.conversationId, 60), source: cap(req.source, 40),
        notes: cap(req.notes, 2000), budget: req.budget, message: req.message,
        createdAt: iso(new Date())
      });
      persist();
      return { ok: true, message: 'Booking request received', reference: bookingId, bookingId: bookingId };
    }

    fail('Endpoint not found: ' + method + ' ' + path, 404);
  }

  function normalizePackage(req) {
    return {
      name: req.name, packageType: req.packageType, investment: Number(req.investment || 0),
      servicesIncluded: req.servicesIncluded || [], image: req.image || '',
      additionalItems: req.additionalItems || { editedImages: '', uneditedImages: '', thankYouCards: 0, albums: [], framedPortraits: [] }
    };
  }

  function toArray(v) {
    if (v === undefined || v === null) return [];
    return Array.isArray(v) ? v : [v];
  }

  window.CS_MOCK = {
    request: function (method, url, opts) { return dispatch(method, url, opts || {}); },
    reset: function () { db = seed(); persist(); }
  };

  if (window.console && console.info) {
    console.info('[Critical Shot] Running in standalone local mode (no backend required). Demo logins: admin@criticalshot.com/admin123, staff@criticalshot.com/staff123, customer@criticalshot.com/customer123');
  }
})();