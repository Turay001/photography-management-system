/* ================================================================== */
/*  Critical Shot — automated test suite (no test framework needed)   */
/*  Run with:  node tests/run-tests.js                                */
/*                                                                    */
/*  Loads the real production scripts (js/db.js, js/business-data.js, */
/*  js/ai-engine.js) inside a sandboxed Node VM with localStorage /   */
/*  sessionStorage shims, then exercises the data layer, the auth +    */
/*  authorization model, booking validation and the assistant engine. */
/* ================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const KEY = 'criticalshot_pms_db_v1';

/* ----------------------------- reporting ------------------------- */
let passed = 0;
let failed = 0;
const failures = [];

function test(name, cond, detail) {
  if (cond) { passed++; console.log('  PASS  ' + name); }
  else {
    failed++;
    failures.push(name + (detail ? ' — ' + detail : ''));
    console.log('  FAIL  ' + name + (detail ? ' — ' + detail : ''));
  }
}
function section(title) { console.log('\n== ' + title + ' =='); }

/* --------------------------- sandbox app ------------------------- */
function newApp(storageSeed) {
  const storage = new Map();
  if (storageSeed) {
    Object.keys(storageSeed).forEach(function (k) { storage.set(k, storageSeed[k]); });
  }
  function makeStorage() {
    return {
      getItem: function (k) { const s = String(k); return storage.has(s) ? storage.get(s) : null; },
      setItem: function (k, v) { storage.set(String(k), String(v)); },
      removeItem: function (k) { storage.delete(String(k)); },
      clear: function () { storage.clear(); },
      key: function (i) { return Array.from(storage.keys())[i] || null; },
      get length() { return storage.size; }
    };
  }
  const quiet = {
    info: function () {},
    log: function () {},
    warn: function () {},
    error: function () { console.error.apply(console, arguments); }
  };
  const sandbox = { console: quiet, localStorage: makeStorage(), sessionStorage: makeStorage() };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);

  ['js/business-data.js', 'js/ai-engine.js', 'js/db.js'].forEach(function (rel) {
    const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    vm.runInContext(code, ctx, { filename: rel });
  });

  return {
    ctx: ctx,
    storage: storage,
    engine: ctx.window.CriticalAIEngine,
    req: function (method, url, body, headers) {
      return ctx.window.CS_MOCK.request(method, url, { body: body || {}, headers: headers || {} })
        .then(function (data) { return { ok: true, status: 200, data: data }; })
        .catch(function (e) { return { ok: false, status: e.status || 500, message: e.message }; });
    }
  };
}

function readDb(app) { return JSON.parse(app.storage.get(KEY)); }

function isoDay(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + (offsetDays || 0));
  return d.toISOString().slice(0, 10);
}

const ADMIN = { Userid: 'u-admin' };
const STAFF = { Userid: 'u-staff' };
const CUST = { Userid: 'u-cust' };

/* ================================================================= */
/*  1. PASSWORD HASHING + LOGIN                                      */
/* ================================================================= */
async function authTests() {
  section('Password hashing & login');

  const app = newApp();

  const good = await app.req('POST', '/api/auth/login', { email: 'admin@criticalshot.com', password: 'admin123' });
  test('admin can sign in with the demo password', good.ok && good.data.role === 'ADMIN');

  const bad = await app.req('POST', '/api/auth/login', { email: 'admin@criticalshot.com', password: 'wrong-password' });
  test('wrong password is rejected with 401', !bad.ok && bad.status === 401);

  const missing = await app.req('POST', '/api/auth/login', { email: 'admin@criticalshot.com' });
  test('missing password is rejected', !missing.ok);

  const stored = readDb(app).users.find(function (u) { return u.email === 'admin@criticalshot.com'; });
  test('seeded password is stored as a salted hash, not plain text',
    stored && String(stored.password).indexOf('sha256$') === 0,
    stored ? String(stored.password).slice(0, 40) : 'no user');

  /* the pure-JS SHA-256 must agree with Node's crypto module */
  if (stored && String(stored.password).indexOf('sha256$') === 0) {
    const parts = String(stored.password).split('$');
    const nodeDigest = crypto.createHash('sha256').update(parts[1] + ':' + 'admin123').digest('hex');
    test('JS SHA-256 digest matches Node crypto', nodeDigest === parts[2], parts[2] + ' vs ' + nodeDigest);
  }

  const reg = await app.req('POST', '/api/auth/register', {
    name: 'Test Customer', email: 'new@example.com', password: 'longenoughpass', contactNumber: '+232 76 111111'
  });
  test('registration succeeds with an 8+ character password', reg.ok && !!reg.data.userId);

  const regShort = await app.req('POST', '/api/auth/register', {
    name: 'Short PW', email: 'short@example.com', password: 'short1'
  });
  test('registration rejects a password shorter than 8 characters',
    !regShort.ok && /at least 8 characters/.test(regShort.message));

  const regBadEmail = await app.req('POST', '/api/auth/register', {
    name: 'No Mail', email: 'not-an-email', password: 'longenoughpass'
  });
  test('registration rejects an invalid email address', !regBadEmail.ok);

  const regDup = await app.req('POST', '/api/auth/register', {
    name: 'Dup', email: 'admin@criticalshot.com', password: 'longenoughpass'
  });
  test('registration rejects a duplicate email', !regDup.ok && /already exists/.test(regDup.message));

  const newSeed = readDb(app);
  const newUser = newSeed.users.find(function (u) { return u.email === 'new@example.com'; });
  test('new accounts are stored with hashed passwords',
    newUser && String(newUser.password).indexOf('sha256$') === 0);

  const newLogin = await app.req('POST', '/api/auth/login', { email: 'new@example.com', password: 'longenoughpass' });
  test('the newly registered account can sign in', newLogin.ok && newLogin.data.role === 'CUSTOMER');

  const staffLogin = await app.req('POST', '/api/auth/login', { email: 'staff@criticalshot.com', password: 'staff123' });
  test('staff demo account still works', staffLogin.ok && staffLogin.data.role === 'STAFF');

  const custLogin = await app.req('POST', '/api/auth/login', { email: 'customer@criticalshot.com', password: 'customer123' });
  test('customer demo account still works', custLogin.ok && custLogin.data.role === 'CUSTOMER');

  return app;
}

/* ================================================================= */
/*  2. LEGACY PLAIN-TEXT MIGRATION                                   */
/* ================================================================= */
async function migrationTests() {
  section('Plain-text password migration');

  const first = newApp();
  const raw = JSON.parse(first.storage.get(KEY));
  raw.users.forEach(function (u) { u.password = 'plain-' + u.email; });  /* simulate an old database */
  const seeded = {};
  seeded[KEY] = JSON.stringify(raw);

  const app = newApp(seeded);
  const migrated = readDb(app);
  const admin = migrated.users.find(function (u) { return u.email === 'admin@criticalshot.com'; });
  test('legacy plain-text passwords are re-hashed on load',
    admin && String(admin.password).indexOf('sha256$') === 0, admin ? admin.password : 'no user');

  const ok = await app.req('POST', '/api/auth/login', { email: 'admin@criticalshot.com', password: 'plain-admin@criticalshot.com' });
  test('owner can still sign in after migration', ok.ok);

  const no = await app.req('POST', '/api/auth/login', { email: 'admin@criticalshot.com', password: 'plain-anything-else' });
  test('migrated account rejects other passwords', !no.ok && no.status === 401);
}

/* ================================================================= */
/*  3. AUTHORIZATION (server-side)                                   */
/* ================================================================= */
async function authorizationTests() {
  section('Authorization (data layer)');

  const app = newApp();

  const anon = await app.req('GET', '/api/bookings/client');
  test('request without a signed-in user is rejected with 401', !anon.ok && anon.status === 401);

  const custAdmin = await app.req('GET', '/admin/bookings', null, CUST);
  test('customer cannot list admin bookings (403)', !custAdmin.ok && custAdmin.status === 403);

  const staffAdmin = await app.req('GET', '/admin/bookings', null, STAFF);
  test('staff cannot list admin bookings (403)', !staffAdmin.ok && staffAdmin.status === 403);

  const adminBookings = await app.req('GET', '/admin/bookings', null, ADMIN);
  test('admin can list admin bookings', adminBookings.ok && Array.isArray(adminBookings.data));

  const custStats = await app.req('GET', '/api/dashboard/stats', null, CUST);
  test('customer cannot read dashboard stats (403)', !custStats.ok && custStats.status === 403);

  const staffStats = await app.req('GET', '/api/dashboard/stats', null, STAFF);
  test('staff cannot read dashboard stats (403)', !staffStats.ok && staffStats.status === 403);

  const adminStats = await app.req('GET', '/api/dashboard/stats', null, ADMIN);
  test('admin can read dashboard stats', adminStats.ok && typeof adminStats.data === 'object');

  const custCfg = await app.req('PUT', '/api/bookings/config', { maxBookingsPerDay: 3 }, CUST);
  test('customer cannot change booking configuration (403)', !custCfg.ok && custCfg.status === 403);

  const custPkg = await app.req('POST', '/api/packages', { name: 'Evil', packageType: 'standard', investment: 1 }, CUST);
  test('customer cannot create a package (403)', !custPkg.ok && custPkg.status === 403);

  const staffPkg = await app.req('POST', '/api/packages', { name: 'Evil', packageType: 'standard', investment: 1 }, STAFF);
  test('staff cannot create a package (403)', !staffPkg.ok && staffPkg.status === 403);

  const adminPkg = await app.req('POST', '/api/packages', {
    name: 'Test Package', packageType: 'standard', investment: 5000, servicesIncluded: ['1 hour coverage']
  }, ADMIN);
  test('admin can create a package', adminPkg.ok && !!adminPkg.data.id);

  const adminPkgDel = await app.req('DELETE', '/api/packages/' + adminPkg.data.id, null, ADMIN);
  test('admin can delete a package', adminPkgDel.ok);

  const custStaff = await app.req('DELETE', '/api/staff/1', null, CUST);
  test('customer cannot delete staff (403)', !custStaff.ok && custStaff.status === 403);

  const custStaffEdit = await app.req('PUT', '/api/staff/1', { name: 'Hacked' }, CUST);
  test('customer cannot edit a staff profile (403)', !custStaffEdit.ok && custStaffEdit.status === 403);

  const selfStaffEdit = await app.req('PUT', '/api/staff/1', { experience: '6' }, STAFF);
  test('staff can edit their own profile', selfStaffEdit.ok);

  const staffListAdmin = await app.req('GET', '/api/staff', null, ADMIN);
  const staffIds = staffListAdmin.ok ? staffListAdmin.data.map(function (s) { return String(s.id); }) : ['1'];
  const otherStaffId = staffIds.find(function (id) { return id !== '1'; });

  const ownBookings = await app.req('GET', '/api/bookings/staff/1', null, STAFF);
  test('staff can read their own bookings', ownBookings.ok && Array.isArray(ownBookings.data));

  if (otherStaffId) {
    const otherBookings = await app.req('GET', '/api/bookings/staff/' + otherStaffId, null, STAFF);
    test('staff cannot read another staff member\'s bookings (403)', !otherBookings.ok && otherBookings.status === 403);
    const adminOther = await app.req('GET', '/api/bookings/staff/' + otherStaffId, null, ADMIN);
    test('admin can read any staff member\'s bookings', adminOther.ok);
  }

  /* favorites + wishlist ownership */
  const ownFav = await app.req('GET', '/api/users/u-cust/favorites', null, CUST);
  test('customer can read their own favorites', ownFav.ok && Array.isArray(ownFav.data));

  const otherFav = await app.req('GET', '/api/users/u-admin/favorites', null, CUST);
  test('customer cannot read another user\'s favorites (403)', !otherFav.ok && otherFav.status === 403);

  const addFav = await app.req('POST', '/api/users/u-cust/favorites/2', null, CUST);
  test('customer can favourite an album', addFav.ok);

  const addFavOther = await app.req('POST', '/api/users/u-admin/favorites/2', null, CUST);
  test('customer cannot modify another user\'s favorites (403)', !addFavOther.ok && addFavOther.status === 403);

  const wish = await app.req('POST', '/api/wishlist/add', { packageId: 1, packageName: 'Standard Wedding Package', price: 1000 }, CUST);
  test('customer can add to their own wishlist', wish.ok);

  const wishList = await app.req('GET', '/api/wishlist/user/u-cust', null, CUST);
  const storedWish = readDb(app).wishlist;
  test('wishlist entries are written for the signed-in user only',
    wishList.ok && storedWish.length === 1 && storedWish[0].userId === 'u-cust',
    JSON.stringify(storedWish.map(function (w) { return w.userId; })));

  const wishOther = await app.req('GET', '/api/wishlist/user/u-admin', null, CUST);
  test('customer cannot read another user\'s wishlist (403)', !wishOther.ok && wishOther.status === 403);

  /* feedback ownership */
  const feedbacks = readDb(app).feedbacks || [];
  const custFeedback = feedbacks.find(function (f) { return String(f.clientId) === 'u-cust'; });
  if (custFeedback) {
    const reg = await app.req('POST', '/api/auth/register', { name: 'Other', email: 'other@example.com', password: 'longenoughpass' });
    const OTHER = { Userid: reg.data.userId };
    const editOther = await app.req('PUT', '/api/feedbacks/' + custFeedback.id, { content: 'hijacked' }, OTHER);
    test('customer cannot edit someone else\'s feedback (403)', !editOther.ok && editOther.status === 403);
    const delOther = await app.req('DELETE', '/api/feedbacks/' + custFeedback.id, null, OTHER);
    test('customer cannot delete someone else\'s feedback (403)', !delOther.ok && delOther.status === 403);
    const editOwn = await app.req('PUT', '/api/feedbacks/' + custFeedback.id, { content: 'Updated by owner' }, CUST);
    test('customer can edit their own feedback', editOwn.ok);
  }

  /* booking ownership */
  const reg2 = await app.req('POST', '/api/auth/register', { name: 'Rival', email: 'rival@example.com', password: 'longenoughpass' });
  const RIVAL = { Userid: reg2.data.userId };
  const seedBookings = readDb(app).bookings;
  const custBooking = seedBookings.find(function (b) { return String(b.clientId) === 'u-cust'; });
  if (custBooking) {
    const steal = await app.req('PATCH', '/api/bookings/cancel/' + custBooking.id, {}, RIVAL);
    test('another customer cannot cancel someone else\'s booking (403)', !steal.ok && steal.status === 403);

    const resched = await app.req('PUT', '/api/bookings/reschedule/' + custBooking.id, { dateTime: isoDay(10) + 'T11:00' }, RIVAL);
    test('another customer cannot reschedule someone else\'s booking (403)', !resched.ok && resched.status === 403);
  }

  const assign = await app.req('PUT', '/api/bookings/' + (custBooking ? custBooking.id : 1) + '/assign', { staffId: 1 }, CUST);
  test('customer cannot assign staff to a booking (403)', !assign.ok && assign.status === 403);

  const adminAssign = await app.req('PUT', '/api/bookings/' + (custBooking ? custBooking.id : 1) + '/assign', { staffId: 1 }, ADMIN);
  test('admin can assign staff to a booking', adminAssign.ok);

  const cfg = await app.req('GET', '/api/bookings/config');
  test('booking configuration stays readable publicly', cfg.ok);
}

/* ================================================================= */
/*  4. BOOKING VALIDATION                                            */
/* ================================================================= */
async function bookingTests() {
  section('Booking rules & validation');

  const app = newApp();
  const cfg = (await app.req('GET', '/api/bookings/config')).data;

  const incomplete = await app.req('POST', '/api/bookings/create', { email: 'a@b.com' }, CUST);
  test('incomplete booking is rejected (400)', !incomplete.ok && incomplete.status === 400);

  const past = await app.req('POST', '/api/bookings/create', {
    email: 'customer@criticalshot.com', phoneNumber: '+232 76 000000',
    location: 'Freetown', packageName: 'Standard Wedding Package', dateTime: '2020-01-01T10:00'
  }, CUST);
  test('booking in the past is rejected', !past.ok);

  const tooSoon = await app.req('POST', '/api/bookings/create', {
    email: 'customer@criticalshot.com', phoneNumber: '+232 76 000000',
    location: 'Freetown', packageName: 'Standard Wedding Package',
    dateTime: isoDay(0) + 'T00:30'
  }, CUST);
  test('same-day booking inside the advance-booking window is rejected',
    !tooSoon.ok && /in advance/.test(tooSoon.message), tooSoon.message);

  const tooFar = await app.req('POST', '/api/bookings/create', {
    email: 'customer@criticalshot.com', phoneNumber: '+232 76 000000',
    location: 'Freetown', packageName: 'Standard Wedding Package',
    dateTime: isoDay(45) + 'T10:00'
  }, CUST);
  test('booking further than maxAdvanceBookingDays is rejected',
    !tooFar.ok && /days from today/.test(tooFar.message), tooFar.message);

  const day = isoDay(5);
  let created = 0;
  for (let i = 0; i < (cfg.maxBookingsPerDay || 3) + 1; i++) {
    const r = await app.req('POST', '/api/bookings/create', {
      email: 'customer@criticalshot.com', phoneNumber: '+232 76 000000',
      location: 'Freetown', packageName: 'Standard Wedding Package',
      dateTime: day + 'T10:00', price: 100000
    }, CUST);
    if (r.ok) created++;
    else break;
  }
  test('daily booking cap is enforced (max ' + (cfg.maxBookingsPerDay || 3) + ' per day)',
    created === (cfg.maxBookingsPerDay || 3), 'created ' + created);

  const ok = await app.req('POST', '/api/bookings/create', {
    email: 'customer@criticalshot.com', phoneNumber: '+232 76 000000',
    location: 'Freetown', packageName: 'Standard Wedding Package',
    dateTime: isoDay(10) + 'T10:00', price: 100000
  }, CUST);
  test('valid future booking is accepted', ok.ok, ok.message);

  const clientList = await app.req('GET', '/api/bookings/client', null, CUST);
  test('bookings are returned to the owning client only', clientList.ok &&
    clientList.data.every(function (b) { return String(b.clientId) === 'u-cust'; }));

  const badCancel = await app.req('POST', '/api/auth/register', { name: 'X', email: 'x@example.com', password: 'longenoughpass' });
  const XSS = { Userid: badCancel.data.userId };
  const foreign = (readDb(app).bookings).find(function (b) { return String(b.clientId) === 'u-cust'; });
  if (foreign) {
    const r = await app.req('PATCH', '/api/bookings/cancel/' + foreign.id, {}, XSS);
    test('foreign cancel attempt fails with 403', !r.ok && r.status === 403);
  }
}

/* ================================================================= */
/*  5. ASSISTANT ENGINE (rule-based)                                 */
/* ================================================================= */
async function assistantTests() {
  section('Rule-based assistant engine');

  const app = newApp();
  const E = app.engine;

  test('engine is exposed as CriticalAIEngine', !!E && typeof E.reply === 'function');

  test('greeting intent is detected', E.intent('Hello there!') === 'greet');
  test('pricing intent is detected', E.intent('How much is a wedding photoshoot?') === 'pricing');
  test('booking intent is detected', E.intent('I want to book a photoshoot') === 'book');
  test('services intent is detected', E.intent('What services do you offer?') === 'services');

  const greet = E.reply('hi', null);
  test('greeting reply mentions it is rule-based', /rule-based/i.test(greet.reply), greet.reply.slice(0, 90));

  const price = E.reply('how much does a wedding photoshoot cost', null);
  test('pricing reply quotes prices in Sierra Leone Leone (Le)',
    /Le\s?[\d,]/.test(price.reply) && !/LKR|Rs\.|LKR\s/i.test(price.reply), price.reply.slice(0, 120));

  const fallbackReply = E.reply('xyzzy plugh banana', null);
  const again = E.reply('xyzzy plugh banana', null);
  test('unknown question gets a non-empty, deterministic reply',
    fallbackReply.reply && fallbackReply.reply.length > 20 && fallbackReply.reply === again.reply,
    fallbackReply.reply.slice(0, 80));
  const dataText = fs.readFileSync(path.join(ROOT, 'js/business-data.js'), 'utf8');
  test('configured fallback reply gives the studio phone number',
    /fallback:[\s\S]{0,400}\+232 99 738064/.test(dataText));
  test('no machine learning model is referenced anywhere in the engine',
    !/tensorflow|onnx|pytorch|neural network|machine learning model/i.test(
      fs.readFileSync(path.join(ROOT, 'js/ai-engine.js'), 'utf8')));

  const svc = E.reply('do you do event coverage?', null);
  test('service question returns a real answer', svc.reply && svc.reply.length > 40);

  const session = E.blank ? E.blank() : null;
  const book = E.reply('I want to book a wedding photoshoot', session);
  test('booking flow starts collecting details', !!book.reply && book.reply.length > 0, book.reply.slice(0, 90));

  const cfgText = fs.readFileSync(path.join(ROOT, 'js/business-data.js'), 'utf8');
  test('assistant name in config is "Critical Assistant"', /name:\s*'Critical Assistant'/.test(cfgText));
  test('assistant tagline states it is rule-based', /rule-based/i.test(cfgText));
}

/* ================================================================= */
/*  6. REPOSITORY-LEVEL CHECKS                                       */
/* ================================================================= */
function repoTests() {
  section('Repository checks');

  const exts = ['.html', '.js', '.md', '.gs', '.css'];
  /* docs/ and tests/ discuss the review wording on purpose, and node_modules
     is third-party — the scan covers the site itself. */
  const skipDirs = ['node_modules', '.git', 'tests', 'docs'];
  let lkrHits = [];
  let aiFirstHits = [];

  function walk(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach(function (e) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (skipDirs.indexOf(e.name) < 0) walk(p); return; }
      if (exts.indexOf(path.extname(e.name).toLowerCase()) < 0) return;
      const txt = fs.readFileSync(p, 'utf8');
      if (/\bLKR\b/.test(txt) || /Sri Lanka|Colombo|Kandy|Negombo|\bJaffna\b/.test(txt)) lkrHits.push(path.relative(ROOT, p));
      if (/AI-first|\bCritical AI\b/.test(txt)) aiFirstHits.push(path.relative(ROOT, p));
    });
  }
  walk(ROOT);

  test('no Sri Lankan currency or location names remain', lkrHits.length === 0, lkrHits.join(', '));
  test('no "AI-first" / "Critical AI" claims remain', aiFirstHits.length === 0, aiFirstHits.join(', '));

  const hasDoc = fs.existsSync(path.join(ROOT, 'docs/ASSISTANT_LOGIC.md'));
  const hasApiDoc = fs.existsSync(path.join(ROOT, 'docs/DATA_MODEL_AND_API.md'));
  const hasSecDoc = fs.existsSync(path.join(ROOT, 'docs/SECURITY.md'));
  const hasTestDoc = fs.existsSync(path.join(ROOT, 'docs/TESTING.md'));
  test('documentation set exists (assistant, data/API, security, testing)', hasDoc && hasApiDoc && hasSecDoc && hasTestDoc);
}

/* ================================================================= */
async function main() {
  console.log('Critical Shot — automated tests');
  await authTests();
  await migrationTests();
  await authorizationTests();
  await bookingTests();
  await assistantTests();
  repoTests();

  console.log('\n----------------------------------------');
  console.log('  passed: ' + passed + '   failed: ' + failed);
  if (failed) {
    console.log('\n  Failures:');
    failures.forEach(function (f) { console.log('   - ' + f); });
    process.exitCode = 1;
  } else {
    console.log('  All tests passed.');
  }
}

main().catch(function (e) {
  console.error('Test harness crashed:', e);
  process.exitCode = 1;
});
