/* ==================================================================== */
/*  Critical Assistant → Google Sheets backend (server-side Apps Script)        */
/*                                                                      */
/*  PRODUCTION backend for POST /api/bookings from the Critical Shot    */
/*  static site. All Google authorization stays server-side.            */
/*                                                                      */
/*  SETUP:                                                              */
/*   1. Spreadsheet exists (e.g. "Critical Shot Bookings").             */
/*   2. Extensions → Apps Script. Paste this whole file. (REPLACES the  */
/*      previous version — note SHEET_ID now also works via the        */
/*      DEFAULT_SHEET_ID fallback, so Script properties are optional.) */
/*   3. (Optional) Project Settings → Script properties:                */
/*        SHEET_ID      = <spreadsheet id from the sheet URL>           */
/*        SHEET_NAME    = Bookings                                      */
/*      or just run setup() once.                                      */
/*   4. Run testBooking() to verify storage without the web app.       */
/*   5. Deploy → Web app: Execute as "Me", who has access "Anyone".     */
/*   6. Put the /exec URL in business-data.js config.sheetsEndpoint.    */
/*                                                                      */
/*  RESPONSES:                                                          */
/*    {ok:true, bookingId, reference}        stored in the sheet        */
/*    {ok:false, duplicate:true, bookingId}  same conversation already  */
/*    {ok:false, retryLater:true, message}   rate limited               */
/*    {ok:false, message}                    validation / backend error */
/* ==================================================================== */

var DEFAULT_SHEET_ID   = '1EO6gzOad_EK3ZTV4X1eMmjGKSSSjhhZGhvZwb4nFeKQ';
var DEFAULT_SHEET_NAME = 'Bookings';

function props() { return PropertiesService.getScriptProperties(); }

/* Sheets/Tabs are resolved at request time so changes apply instantly.
   Script properties override the built-in defaults below. */
function sheetId()   { return props().getProperty('SHEET_ID')   || DEFAULT_SHEET_ID; }
function sheetName() { return props().getProperty('SHEET_NAME') || DEFAULT_SHEET_NAME; }

/* Canonical 16-column field order. KEEP IN SYNC with
   business-data.js → CRITICAL_AI_CONFIG.booking.sheetColumns. */
var COLUMNS = [
  'Booking ID', 'Date Submitted', 'Customer Name', 'Phone/WhatsApp', 'Email',
  'Service', 'Shoot Type', 'Event Date', 'Event Time', 'Location', 'Package',
  'Price', 'Requirements', 'Status', 'AI Conversation ID', 'Notes'
];

var MAX_FIELD = 2000;

/* Anti-spam / idempotent-retry windows (CacheService, seconds). */
var DEDUPE_TTL_SECONDS    = 6 * 3600;  // idempotent retries honoured for 6h
var SUBMIT_COOLDOWN_SECS  = 20;        // per conversationId

/* --------------------------- HTTP handlers --------------------------- */

function doPost(e) {
  try {
    var body = String((e && e.postData && e.postData.contents) || '').trim();
    if (!body) throw safe('empty-request');
    var data = null;
    try { data = JSON.parse(body); } catch (err) { throw safe('bad-json'); }
    if (!data || data.action !== 'appendBooking' || !data.booking) throw safe('bad-action');

    var booking = normalize(data.booking);
    var errors = validate(booking);
    /* Status is always set server-side so a "received" request is never
       made to look like a confirmed booking. */
    booking.status = 'New';
    if (errors.length) {
      console.log('CS_BOOKING_VALIDATION', booking.conversationId, errors.join(','));
      return respond({ ok: false, message: 'Some booking details are missing or invalid — please review and try again.' });
    }

    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      return respond(storeBooking(booking));
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    /* Technical detail to Stackdriver only — never to the client. */
    console.error('CS_BOOKING_ERROR', String(err && err.stack || err));
    return respond(baseError());
  }
}

function doGet(e) {
  var html = '<meta charset="utf-8"><h1>Critical Assistant → Sheets backend</h1>'
    + '<p>POST <code>{action:"appendBooking", booking:{...}}</code> with JSON.</p>'
    + '<p>Sheet: <code>' + sheetName() + '</code> · ' + COLUMNS.length + ' columns.</p>'
    + '<p>Secrets stay in Script Properties / server-side defaults.</p>';
  return HtmlService.createHtmlOutput(html);
}

/* ----------------------------- storage -------------------------------- */

function storeBooking(booking) {
  var cache = CacheService.getScriptCache();

  /* 1) Per-conversation dedupe: a previous attempt already wrote this. */
  if (booking.conversationId) {
    var seen = cache.get('dup:' + booking.conversationId);
    if (seen) {
      console.log('CS_BOOKING_DUPLICATE', booking.conversationId, seen);
      return { ok: false, duplicate: true, bookingId: seen, reference: seen };
    }
    /* 2) Light anti-spam cooldown per conversation. */
    if (cache.get('last:' + booking.conversationId)) {
      return { ok: false, retryLater: true, message: 'Thanks for your patience — give me a few seconds and try again.' };
    }
  }

  var ws = ensureSheet();
  var headerRow = header(ws);

  /* 3) Idempotent retry: booking ID already on the sheet → success. */
  var proposed = /^CS-\d{8}-\d{4}$/.test(booking.bookingId || '') ? booking.bookingId : null;
  if (proposed) {
    var existing = findBookingId(ws, proposed, headerRow);
    if (existing) {
      cache && cache.put('dup:' + booking.conversationId, existing, DEDUPE_TTL_SECONDS);
      return { ok: false, duplicate: true, bookingId: existing, reference: existing };
    }
  }

  /* 4) Authoritative sequential Booking ID: CS-YYYYMMDD-0001, -0002, … */
  booking.bookingId = nextBookingId(ws, proposed, headerRow);
  booking.dateSubmitted = new Date().toISOString();

  ws.appendRow(rowArray(booking));

  if (booking.conversationId) {
    cache && cache.put('dup:' + booking.conversationId, booking.bookingId, DEDUPE_TTL_SECONDS);
    cache && cache.put('last:' + booking.conversationId, '1', SUBMIT_COOLDOWN_SECS);
  }
  console.log('CS_BOOKING_OK', booking.bookingId, booking.conversationId, booking.name);
  return { ok: true, bookingId: booking.bookingId, reference: booking.bookingId };
}

/* ------------------------------ sheets -------------------------------- */

function ensureSheet() {
  var ss = SpreadsheetApp.openById(sheetId());
  if (!ss) throw safe('no-spreadsheet');
  var ws = ss.getSheetByName(sheetName());
  if (!ws) ws = ss.insertSheet(sheetName());
  ensureHeader(ws);
  return ws;
}

function header(ws) {
  if (ws.getLastRow() < 1) return [];
  return ws.getRange(1, 1, 1, COLUMNS.length).getValues()[0];
}

function ensureHeader(ws) {
  if (ws.getLastRow() > 0) return;
  ws.appendRow(COLUMNS);
  var r = ws.getRange(1, 1, 1, COLUMNS.length);
  r.setFontWeight('bold').setBackground('#0b0b0d').setFontColor('#ffffff');
  ws.setFrozenRows(1);
}

function rowArray(b) {
  return [
    b.bookingId || '', b.dateSubmitted || '', b.name || '', b.phone || '', b.email || '',
    b.service || '', b.shootType || '', b.eventDate || '', b.time || '', b.location || '',
    b.packageName || '', b.price || '', b.requirements || '', b.status || 'New',
    b.conversationId || '', b.notes || ''
  ];
}

function findBookingId(ws, proposed, headerRow) {
  if (headerRow[0] !== COLUMNS[0]) return null; /* don't scan unknown sheets */
  var last = ws.getLastRow();
  if (last < 2) return null;
  var ids = ws.getRange(2, 1, last - 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === proposed) return String(ids[i][0]).trim();
  }
  return null;
}

function nextBookingId(ws, proposed, headerRow) {
  var ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  var today = 'CS-' + ymd + '-';
  if (headerRow[0] === COLUMNS[0]) {
    var last = ws.getLastRow();
    var max = 0;
    if (last >= 2) {
      var ids = ws.getRange(2, 1, last - 1).getValues();
      for (var i = 0; i < ids.length; i++) {
        var s = String(ids[i][0]).trim();
        if (s.indexOf(today) === 0) {
          var n = parseInt(s.slice(today.length), 10);
          if (!isNaN(n) && n > max) max = n;
        }
      }
    }
    return today + String(max + 1).padStart(4, '0');
  }
  if (proposed) return proposed;
  return today + '0001';
}

/* --------------------------- normalization ---------------------------- */

function normalize(raw) {
  var b = raw || {};
  function clean(v, max) {
    return String(v == null ? '' : v)
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max || MAX_FIELD);
  }
  return {
    bookingId:      clean(b.bookingId, 20),
    dateSubmitted:  clean(b.dateSubmitted, 30),
    name:           clean(b.name, 80),
    phone:          clean(b.phone, 20),
    email:          clean(b.email, 120),
    service:        clean(b.service, 80),
    shootType:      clean(b.shootType, 80),
    eventDate:      clean(b.eventDate, 20),
    time:           clean(b.time, 40),
    location:       clean(b.location, 120),
    packageName:    clean(b.packageName, 80),
    price:          clean(b.price, 60),
    requirements:   clean(b.requirements, MAX_FIELD),
    status:         'New',
    conversationId: clean(b.conversationId, 60),
    notes:          clean(b.notes, MAX_FIELD)
  };
}

/* ---------------------------- validation ------------------------------ */

function validate(b) {
  var errors = [];
  var empty = function (v) { return v === '' || v == null; };

  if (!empty(b.name)) {
    if (b.name.length < 2) errors.push('name');
    if (!/^[a-z'.\- ]+$/i.test(b.name)) errors.push('name');
  } else errors.push('name');

  var digits = String(b.phone || '').replace(/\D/g, '');
  if (!empty(b.phone) && digits.length >= 7 && digits.length <= 15) {
    if (!/^\+?[0-9\s().-]+$/.test(b.phone)) errors.push('phone');
  } else errors.push('phone');

  if (empty(b.email)) b.email = '';
  else if (!/^[a-z0-9+_.%-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(b.email)) errors.push('email');

  if (empty(b.service)) errors.push('service');
  else if (b.service.length < 2) errors.push('service');

  if (empty(b.eventDate)) errors.push('eventDate');
  else {
    var m  = String(b.eventDate).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    var md = String(b.eventDate).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    var d = null;
    if (m) d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    else if (md) d = new Date(Number(md[3]), Number(md[2]) - 1, Number(md[1]));
    if (!d || isNaN(d.getTime())) errors.push('eventDate');
    else {
      var today0 = new Date(); today0.setHours(0, 0, 0, 0);
      if (d.getTime() < today0.getTime()) errors.push('eventDate.past');
      var limit = new Date(today0); limit.setDate(limit.getDate() + 730);
      if (d.getTime() > limit.getTime()) errors.push('eventDate.range');
    }
  }

  if (empty(b.location)) errors.push('location');
  else if (b.location.length < 2) errors.push('location');

  if (empty(b.time)) b.time = '';
  else if (b.time.length > 40) errors.push('time');
  if (empty(b.shootType)) b.shootType = '';
  if (empty(b.packageName)) b.packageName = '';
  if (b.requirements.length > MAX_FIELD) errors.push('requirements');
  if (b.notes.length > MAX_FIELD) errors.push('notes');
  return errors;
}

/* ----------------------------- helpers -------------------------------- */

function baseError() { return { ok: false, message: 'The booking could not be stored right now. Please try again shortly.' }; }
function safe(code) { var e = new Error(code); e.safe = true; return e; }
function respond(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* --------------------------- admin helpers ---------------------------- */

/* One-time setup: store secrets for this project. Run once, no args. */
function setup() {
  var p = props();
  p.setProperty('SHEET_ID', DEFAULT_SHEET_ID);
  p.setProperty('SHEET_NAME', DEFAULT_SHEET_NAME);
  Logger.log('stored SHEET_ID   = ' + p.getProperty('SHEET_ID'));
  Logger.log('stored SHEET_NAME = ' + p.getProperty('SHEET_NAME'));
}

/* Verify what is configured (never prints secret values). */
function configStatus() {
  Logger.log('SHEET_ID   : ' + (props().getProperty('SHEET_ID') || '(default)'));
  Logger.log('SHEET_NAME : ' + (props().getProperty('SHEET_NAME') || '(default ' + DEFAULT_SHEET_NAME + ')'));
  Logger.log('Sheet opens ok : ' + !!SpreadsheetApp.openById(sheetId()));
}

/* Editor-only self test: writes one row directly via the same storage
   path. Proves spreadsheet, tab, columns and permissions all work. */
function testBooking() {
  var booking = normalize({
    name: 'Critical Shot Test', phone: '0991234567', email: 'test@criticalshot.example',
    service: 'Photography', shootType: 'Test', eventDate: '2026-12-01', time: '4:00 PM',
    location: 'Freetown', packageName: 'Standard', price: '800',
    requirements: 'Editor self-test', conversationId: 'editor-test'
  });
  var result = storeBooking(booking);
  Logger.log('storeBooking result: ' + JSON.stringify(result));
}