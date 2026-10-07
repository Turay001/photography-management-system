# Critical Shot — Static Frontend

A plain HTML/CSS/vanilla-JS re-implementation of the Critical Shot photography
management system frontend (originally Next.js `/frontend`). It runs **fully
standalone** — no backend required — via a built-in local data layer
(`js/db.js`) that mimics the original Spring Boot API.

The site includes **Critical Assistant** — a *rule-based* (deterministic,
keyword-driven, **no machine learning**) photography booking assistant. It
greets visitors, answers service/price/FAQ questions, collects a booking
conversationally (summary → confirm → edit) and submits it to the backend,
with honest "request received" responses and rate limiting. It is available on
every page as a floating launcher and inline on the landing page,
`/ai-assistant` and `/packages`. See *Critical Assistant* below and
`docs/ASSISTANT_LOGIC.md`.

No build step, no framework, no bundler. Open `index.html` directly.

---

## Documentation

| Document | Contents |
|---|---|
| `docs/ASSISTANT_LOGIC.md` | how the rule-based assistant works: intents, keywords, booking state machine, submission flow |
| `docs/DATA_MODEL_AND_API.md` | every collection/field and every API endpoint with its auth rule |
| `docs/SECURITY.md` | password hashing, session, permission matrix, validation, known limitations |
| `docs/TESTING.md` | how to run the automated suite, coverage tables, manual checklist |
| `docs/REVIEW_RESPONSE.md` | point-by-point reply to the code review, incl. revised title and wording |
| `GOOGLE_SHEETS.md` | optional Google Sheets booking backend |

### Running the tests

```bash
node tests/run-tests.js
```

74 assertions over password hashing, authorization, booking rules, the
rule-based assistant and repository checks — details and results in
`docs/TESTING.md`.

---

## How to run

### Option A — Standalone (default, no backend)

```bash
start index.html
```

works from disk. Everything is stored in the browser (`localStorage`), seeded
with realistic demo data on first run. Full CRUD works with no server.

You can also serve the folder if you prefer:

```bash
npx serve -l 3001 static-site
# or:  python -m http.server 3001 --directory static-site
```

### Option B — With the real Spring Boot backend

> The original `backend/` was removed from this project. If you keep your own
> copy, the API contract below still applies. Standalone mode is the default
> and requires nothing.

1. Start the backend:

```bash
cd backend
./mvnw spring-boot:run      # or: mvn spring-boot:run
```

2. Point the frontend at it and disable the local data layer (see *Switching
   back to the real backend* below).
3. Serve the site on a whitelisted port (see CORS caveat).

---

## Switching back to the real backend

The local data layer is always active when `window.CS_MOCK` is present — it is
auto-injected by `js/core.js` the moment the page loads. To talk to the real
API again:

1. Delete (or comment out) the `document.write` block at the top of
   `js/core.js` so `js/db.js` is never loaded.
2. Set `CS.API_BASE` back to the live API base URL in `js/core.js`.

---

## Standalone data layer (`js/db.js`)

- **Storage:** everything lives under the single localStorage key
  `criticalshot_pms_db_v1`. On first visit the mock seeds users, staff,
  packages, albums, portfolio, bookings, feedback, wishlist items, leads,
  admin activities and the booking configuration.
- **Reset:** open the browser console and run `CS_MOCK.reset()` to wipe all
  changes and reseed the demo data.
- **Uploads:** image/photo uploads (albums, portfolio, profile) are read as
  data URLs and stored in the same localStorage key. If the browser quota is
  exceeded the app quietly compacts stored images to
  `images/album-placeholder.jpg` so the page keeps working (uploads may then
  render as the placeholder).
- **PDF exports** (albums, bookings) are generated client-side by `pdf-lite.js`
  and work from disk too.

### Demo accounts

All three are seeded and sign in from the login page:

| Role     | Email                     | Password   | Seed data |
|----------|---------------------------|------------|-----------|
| Admin    | `admin@criticalshot.com`  | `admin123` | full pre-filled dashboard, staff, packages, albums, bookings |
| Staff    | `staff@criticalshot.com`  | `staff123` | linked staff record "Foday Sesay" with assigned bookings |
| Customer | `customer@criticalshot.com` | `customer123` | favorites + past/completed bookings (can post feedback) |

The credentials are also printed to the browser console on load.

Default booking rules: max `3` bookings/day, bookings can be made between `1`
and `30` days in advance, cancellations/reschedules must be at least `24`
hours before the booking time.

---

## Critical Assistant (rule-based assistant + booking intake)

Critical Assistant is a deterministic, **rule-based** assistant — keyword
matching, regular-expression extraction and answers stored in configuration.
There is **no machine-learning model, no LLM and no external API key**: no
network calls are required for it to work. It collects a booking
conversationally and submits it when confirmed.

### How it works

- `js/business-data.js` — **single source of knowledge**: business facts,
  services (with prices + keywords), the price guide, booking fields/columns,
  behavior config (rate limit, message cap, storage keys). Edit this file to
  change what the assistant knows or how it behaves.
- `js/ai-engine.js` — the rule engine. Detects intent, service, shoot type and
  dates from natural language; runs a progressive field-collection flow
  (`idle → collecting → confirming → editing`); builds the 16-column booking
  payload and submits to the local data layer **and** (optionally) Google
  Sheets.
- `js/ai-chat-lib.js` — the UI. `CS.Assistant(mount, opts)` inline chat widget,
  plus a floating launcher + full-screen overlay inserted automatically on
  pages without inline chat. Persists draft + conversation per visit.
- Every submission is honest: the visitor sees *"request received — the team
  will confirm"* with a reference, never a fake confirmation. A 20-second
  cooldown prevents spam; a failed save keeps the draft and offers Retry.
- The booking is posted to `POST /api/bookings` (a **backend endpoint**: the
  standalone mock `js/db.js`, or the server-side Google Apps Script web app
  when connected). Success is only reported to the customer after the backend
  confirms the row was stored — never claimed in advance. See *Google Sheets*
  below.
- Every booking gets a sequential ID like `CS-20260920-0001` and `Status: New`.
  The local studio log is inspectable via **Admin → Leads**, `CS_MOCK.reset()`
  or the browser console.

### Google Sheets backend

Follow `GOOGLE_SHEETS.md`: deploy `google-apps-script/gs-sheet-submit.gs`
(secrets live in **Script Properties**, never the frontend), then paste your
web-app URL into `CRITICAL_AI_CONFIG.config.sheetsEndpoint` in
`js/business-data.js`. Bookings land in **Critical Shot Bookings / Bookings**
with the 16 columns defined in `CRITICAL_AI_CONFIG.booking.sheetColumns`.

### Placement

- **Inline chat**: mounted on `index.html` (`#ai-assistant` section),
  `ai-assistant.html` and `packages.html` — these pages load the assistant
  scripts as
  static `<script>` tags.
- **Every other page**: `js/core.js` dynamically loads the three assistant
  scripts on
  DOM ready and shows the floating launcher.
- Opt out of the launcher with `?no-ai` (e.g. during screenshots), or set
  `CRITICAL_AI_CONFIG.config.launcher = false` to disable site-wide.

---

## Auth & authorization in standalone mode

- **Passwords are never stored in plain text**: every password (including the
  three demo accounts) is saved as a salted SHA-256 digest
  `sha256$<salt>$<hex>`; older plain-text records are re-hashed on load.
  Registration and staff password changes enforce a minimum of 8 characters.
- **Roles** come from the mock session (`sessionStorage` keys `userId`,
  `email`, `role`, `token`) and are re-checked in the data layer: `js/core.js`
  sends the signed-in id as a `Userid` header on every request, and `js/db.js`
  enforces `requireUser` / `requireAdmin` / owner-or-admin rules per endpoint.
  A page that forgets its guard can never expose a protected action.
- Full model, permission matrix and known limitations: `docs/SECURITY.md`.
- Registering a customer from the login page creates a real account **and** a
  linked customer record.
- Adding a staff member via *Manage Staff → Add New Staff* also creates a
  working `STAFF` login (same email + password you set).
- Demo passwords follow the ≥ 8 char rule, so public registration uses your own
  password.
- Staff sign-in routes to `staff-dashboard.html`; admin routes to `admin.html`.

> If you connect the real Spring Boot backend instead, its auth behaves slightly
> differently (literal `Userid` headers, HttpSession profile cookies,
> CORS-restricted origins). The mock reproduces the same API contract so the
> pages behave identically either way.

---

## Important CORS caveat (backend mode only)

The backend `WebConfig` allows **only** these origins:

- `http://localhost:3000`
- `http://localhost:3001`
- `http://localhost:3002`
- `http://localhost:3003`

`file://` pages send `Origin: null`, which is **not** in that list, so a page
opened directly from disk cannot call the backend (every request is
CORS-blocked). This does **not** apply to standalone mode — the local data
layer has no origin restrictions.

To use the full app against the backend:

1. Serve the `static-site` folder on one of the whitelisted ports (e.g. 3001).
2. Or edit `backend/.../WebConfig.java` and add your origin to the list:
   ```java
   allowedOrigins("http://localhost:3000", ..., "http://localhost:3001");
   // or allow in dev:
   // .allowedOriginPatterns("*")
   ```

---

## Page map (route → static file)

| Route | File | Access |
|---|---|---|
| `/` (landing) | `index.html` | public |
| `/login` | `login.html` | public |
| `/admin` | `admin.html` | admin |
| `/bookings/create` | `bookings-create.html` | logged-in |
| `/bookings` (history) | `bookings.html` | customer |
| `/admin/bookings` | `bookings-admin.html` | admin |
| `/admin/bookings/{id}` + new | `bookings-admin-detail.html` (`?id=`/`?new=1`) | admin |
| `/admin/booking-config` | `bookings-config.html` | admin |
| `/packages` | `packages.html` | public |
| `/packages/admin` | `packages-admin.html` | admin |
| `/packages/create` | `packages-create.html` | admin |
| `/packages/update/{id}` | `packages-edit.html` (`?id=`) | admin |
| `/packages/Customize/{id}` | `packages-customize.html` (`?id=`) | public |
| `/albums/admin` | `albums.html` | admin |
| `/albums/create` | `albums-create.html` | admin |
| `/albums/update/{id}` | `albums-edit.html` (`?id=`) | admin |
| `/albums` (user gallery) | `albums-user.html` | logged-in |
| `/album/{id}` (view) | `albums-view.html` (`?id=`) | public |
| `/portfolio/admin` | `portfolio.html` | admin |
| `/portfolio/create` | `portfolio-create.html` | admin |
| `/portfolio/update/{id}` | `portfolio-edit.html` (`?id=`) | admin |
| `/portfolio` (user) | `portfolio-user.html` | public |
| `/staff/dashboard` | `staff-dashboard.html` | staff |
| `/staff/assignments?staffId=` | `staff-assignments.html` | staff |
| `/staff/assign/{id}` | `staff-assign.html` (`?id=`) | admin |
| `/staff/add` | `staff-add.html` | admin |
| `/staff/stafflist` | `staff.html` | admin |
| `/staff/staffprofile/{id}` | `staff-profile.html` (`?id=`) | logged-in |
| `/staff/update/{id}` | `staff-edit.html` (`?id=`) | admin |
| `/feedback` | `feedback.html` | public (edit/delete only own) |
| `/feedback/create` | `feedback-create.html` | customer with a booking |
| `/wishlist` | `wishlist.html` | customer |
| `/UserProfile/profile` | `profile.html` | logged-in |
| `/UserProfile/edit` | `profile-edit.html` | logged-in |
| `/ai-assistant` | `ai-assistant.html` | public |

Notes:

- Query params replace Next.js dynamic routes (`?id=`, `?staffId=`, ...).
- Admin pages use the dark sidebar shell (`CS.renderAdminShell`).
- `/users` (admin user management) is **not** built: the original Next.js files
  (`users/page.tsx`, `UserService.ts`, `UserForm.tsx`) are empty stubs and the
  backend exposes no user-admin API.

---

## Architecture / files

```
static-site/
├─ index.html               landing (hero, craft, gallery, pricing,
│                           contact, inline assistant section)
├─ ai-assistant.html        dedicated full-page Critical Assistant
├─ *.html                   one file per route (see map above)
├─ docs/                    assistant logic, data model & API, security, testing,
│                            review response
├─ tests/                   run-tests.js — automated suite (node tests/run-tests.js)
├─ google-apps-script/      gs-sheet-submit.gs (+ this is where GOOGLE_SHEETS.md)
├─ css/
│  ├─ style.css             shared brand styles (dark landing + light app)
│  └─ app.css               app-page light-theme styles & badges/buttons
├─ js/
│  ├─ core.js               CS runtime: session, api, icons, header/footer,
│  │                        admin shell, badges, pdf/pdf-image, wishlist,
│  │                        auth guards; auto-injects js/db.js when no backend
│  │                        is present; dynamically loads the assistant libs on
│  │                        pages without inline chat
│  ├─ db.js                 standalone data layer: localStorage-backed mock
│  │                        (window.CS_MOCK), seeds + full API simulation,
│  │                        password hashing + authorization checks
│  ├─ business-data.js      assistant knowledge/config source
│  ├─ ai-engine.js          rule-based assistant engine (intents, booking flow,
│  │                        payload) — no machine learning
│  ├─ ai-chat-lib.js        CS.Assistant chat widget + launcher/overlay UI
│  ├─ pdf-lite.js           tiny client-side PDF writer (text/rect/img)
│  ├─ packages-form.js      shared create/edit package form
│  ├─ landing-data.js       copy/sections for the landing page
│  └─ pages/*.js            one controller per page
└─ images/                  static images (icons/placeholders are inline SVG)
```

Session storage keys: `userId`, `email`, `role`, `token` (set by `js/pages/login.js`).

Local data storage key: `criticalshot_pms_db_v1` (managed by `js/db.js`; reset
in the console with `CS_MOCK.reset()`).