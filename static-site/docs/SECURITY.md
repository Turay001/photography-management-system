# Security model

> Scope: this is a **standalone, browser-only** demo — the "backend"
> (`js/db.js`) runs in the same page as the UI and stores data in
> `localStorage`. That imposes hard limits (any user can edit their own
> browser storage), so the model below is designed to be *correct for the
> contract it exposes*: every protected operation is checked in the data
> layer, not only in the page, so a missing page guard can never turn into an
> unprotected action. The same checks map 1:1 onto server-side checks if the
> Spring Boot backend is restored.

## 1. Passwords

| Aspect | Implementation |
|---|---|
| Storage format | `sha256$<salt>$<hex>` where `<hex>` = SHA-256(`<salt>:<password>`) |
| Salt | 12 random characters per password (`Date.now().toString(36)` + `Math.random()`) |
| Verification | re-derive the digest from the stored salt and compare in **constant time** (byte-wise XOR accumulator) |
| Minimum length | 8 characters, enforced on registration, staff creation and staff password change |
| Legacy data | `upgradePasswords()` re-hashes any plain-text password found on load — one-time migration, no plain text is ever kept |
| Seed accounts | the three demo accounts are stored hashed like every other account |

Implementation: `hashPassword()`, `verifyPassword()`, `sha256()` in
`js/db.js`. A small pure-JS SHA-256 is used because `crypto.subtle` is
unavailable on `file://` pages; `tests/run-tests.js` verifies the output
byte-for-byte against Node's `crypto` module.

Plaintext is never written to storage, never returned by an endpoint
(`GET /api/auth/profile/:id` returns `{id, role, name, email, contactNumber,
joinDate}` only) and never logged.

## 2. Session

- On sign-in, `js/pages/login.js` stores `userId`, `email`, `role`, `token`
  in `sessionStorage` (cleared when the tab closes or on logout).
- `js/core.js` attaches the signed-in `userId` as a `Userid` header on every
  request — the request body is never trusted for identity.
- Because this runs client-side, `sessionStorage` is not a secret against a
  determined local attacker; a real deployment replaces this with an
  HttpOnly/SameSite cookie or a server-issued JWT handled by the backend.

## 3. Authorization

Two layers, always both:

1. **Page guards** — `CS.auth.requireLogin()` / `CS.auth.requireRole()` in
   `js/core.js`, plus the inline checks each page performs on load
   (`CS.session.isLoggedIn()`, role `ADMIN`/`STAFF` checks). These give the
   user a redirect instead of an error page.
2. **Data-layer guards** — in `js/db.js`:
   - `requireUser(headers)` → 401 when no signed-in user,
   - `requireAdmin(headers)` → 403 unless `ADMIN`,
   - `ownsOrAdmin(headers, ownerId)` → 403 unless the owner or an `ADMIN`,
   - `staffSelfOrAdmin(headers, record)` → 403 unless `ADMIN` or the same
     email as the staff record,
   - `minPasswordLen(req)` → 400 for passwords shorter than 8 characters.

### Permission matrix

| Action | Visitor | Customer | Staff | Admin |
|---|---|---|---|---|
| Browse packages/albums/portfolio/feedback | ✓ | ✓ | ✓ | ✓ |
| Register / sign in | ✓ | — | — | — |
| Create booking | ✗ | ✓ (self) | ✓ (self) | ✓ |
| View / reschedule / cancel a booking | ✗ | own only | own only | any |
| Admin booking list, status edits, staff assignment | ✗ | ✗ | ✗ | ✓ |
| Dashboard stats & activity feed | ✗ | ✗ | ✗ | ✓ |
| Change booking rules | ✗ | ✗ | ✗ | ✓ |
| Create/edit/delete packages, albums, portfolio | ✗ | ✗ | ✗ | ✓ |
| Create/delete staff, list staff | ✗ | ✗ | ✗ | ✓ |
| Edit staff profile | ✗ | ✗ | own | any |
| View assigned bookings | ✗ | ✗ | own | any |
| Favourites / wishlist | ✗ | own only | own only | own only |
| Post feedback | ✗ | with a booking | with a booking | with a booking |
| Edit/delete feedback | ✗ | own only | own only | any |
| Public booking intake (`POST /api/bookings`) | ✓ | ✓ | ✓ | ✓ |

Every row above is enforced by tests in `tests/run-tests.js`.

## 4. Input validation & output safety

- **Booking rules** (`validateBookingDate`): valid date, not in the past,
  `minAdvanceBookingDays`…`maxAdvanceBookingDays` window, and a per-day cap
  (`maxBookingsPerDay`). Same rules for reschedules, plus
  `rescheduleWindowHours`/`cancellationWindowHours` warnings.
- **Required fields** are checked server-side as well as in the form
  (`email`, `phoneNumber`, `location`, `packageName`, `dateTime`).
- **Assistant intake** strips control characters and caps every field
  (`cap()` in `js/db.js`: name 80, phone 20, email 120, requirements 2000 …)
  and forces `status: 'New'`, so the public endpoint cannot be used to write
  arbitrary status/notes.
- **Password change** on a staff record re-hashes immediately; a short
  password is rejected with 400.
- **Output encoding**: all dynamic strings rendered by pages go through
  `CS.esc()` (`js/core.js`), which HTML-escapes `& < > " '`. This is the
  primary XSS defence for user-supplied content (names, feedback, package
  names, booking details).
- **Uploads** are read as data URLs and stored, never executed; image fields
  are rendered through `<img src>` only.

## 5. Rate limiting & abuse

- Assistant submissions are throttled by
  `CRITICAL_AI_CONFIG.config.rateLimitSeconds` in `js/ai-chat-lib.js`
  (client-side cooldown per session).
- Message length caps (`minMessageLength`/`maxMessageLength`) and a field
  length cap in `js/db.js` bound the size of any write.
- Duplicate registration and duplicate staff emails are rejected.

## 6. Secrets

- No API keys are required for the assistant — it is pure client logic.
- The optional Google Sheets integration keeps its secret in **Script
  Properties** on the Apps Script side, never in the frontend
  (`GOOGLE_SHEETS.md`).
- Demo credentials are printed to the browser console **for the demo only**;
  they are seeded accounts, not real user data.

## 7. Known limitations (documented honestly)

| Limitation | Why | Mitigation path |
|---|---|---|
| `sessionStorage` can be edited by the page owner | no server in standalone mode | real backend issues HttpOnly cookies/JWT |
| `localStorage` can be edited by the user | same | server-side storage (Spring Boot / Sheets) |
| Client-side SHA-256 (not bcrypt/argon2) | must run from `file://` without Web Crypto | backend uses a proper password KDF |
| No CSRF tokens | no cookies are sent | add tokens when cookies are introduced |
| Public booking intake is unauthenticated by design | visitors must be able to ask for a quote | add a honeypot/CAPTCHA or sign-in requirement in production |

These are stated in `docs/REVIEW_RESPONSE.md` as part of the review reply.
