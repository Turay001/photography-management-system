# Testing

## How to run

```bash
node tests/run-tests.js
```

No framework, no dependencies — Node.js only (tested with Node v24). The
process exits with code `1` if any test fails, so it can be used in CI.

## What the automated suite does

`tests/run-tests.js` loads the **real production scripts**
(`js/business-data.js`, `js/ai-engine.js`, `js/db.js`) inside a sandboxed
Node `vm` context with `localStorage`/`sessionStorage` shims, then drives the
public API (`window.CS_MOCK.request`) exactly the way the pages do. Nothing is
mocked out: the tests exercise the code that ships.

| Group | # | What it proves |
|---|---:|---|
| Password hashing & login | 13 | seeded passwords are stored as `sha256$…`, the pure-JS SHA-256 matches Node's `crypto`, wrong/missing passwords are rejected with 401, registration enforces 8 characters / valid unique email, all three demo logins work |
| Plain-text password migration | 3 | a database written before hashing is re-hashed on load and still signs in |
| Authorization (data layer) | 33 | every protected endpoint returns 401/403 for the wrong role or the wrong owner, and works for the right one (admin bookings, dashboard, config, packages, albums, portfolio, staff, favourites, wishlist, feedback, booking ownership, staff assignment) |
| Booking rules & validation | 8 | required fields, past dates, advance window, 30-day maximum, 3-per-day cap, owner-only listing, foreign cancel/reschedule blocked |
| Rule-based assistant engine | 14 | intent detection (greet/pricing/book/services), rule-based greeting wording, `Le` pricing with no `LKR`, deterministic unknown-question handling, configured fallback phone number, no machine-learning references, booking flow starts collecting, config naming |
| Repository checks | 3 | no Sri Lankan currency/place names anywhere, no "AI-first"/"Critical AI" claims, documentation set present |

**Latest run: 74 passed, 0 failed.**

```
Critical Shot — automated tests

== Password hashing & login ==            13 passed
== Plain-text password migration ==        3 passed
== Authorization (data layer) ==          33 passed
== Booking rules & validation ==           8 passed
== Rule-based assistant engine ==         14 passed
== Repository checks ==                    3 passed

----------------------------------------
  passed: 74   failed: 0
  All tests passed.
```

## Automated coverage detail

### Authentication & password storage
| # | Test | Expected |
|---:|---|---|
| 1 | `POST /api/auth/login` admin with `admin123` | 200, role `ADMIN` |
| 2 | wrong password | 401 |
| 3 | missing password | 401 |
| 4 | inspect seeded `users[].password` | starts with `sha256$` |
| 5 | digest vs Node `crypto.createHash('sha256')` | byte-identical |
| 6 | register 8+ char password | 200, user created |
| 7 | register 6 char password | 400 "at least 8 characters" |
| 8 | register invalid email | 400 |
| 9 | register duplicate email | 400 "already exists" |
| 10 | new account stored password | hashed |
| 11 | sign in as new account | 200, role `CUSTOMER` |
| 12 | staff demo login | 200, role `STAFF` |
| 13 | customer demo login | 200, role `CUSTOMER` |

### Authorization (data layer)
| # | Test | Expected |
|---:|---|---|
| 1 | `GET /api/bookings/client` without header | 401 |
| 2–3 | customer/staff → `GET /admin/bookings` | 403 |
| 4 | admin → `GET /admin/bookings` | 200 array |
| 5–6 | customer/staff → `GET /api/dashboard/stats` | 403 |
| 7 | admin → dashboard stats | 200 |
| 8 | customer → `PUT /api/bookings/config` | 403 |
| 9–10 | customer/staff → `POST /api/packages` | 403 |
| 11–12 | admin → create/delete package | 200 |
| 13–14 | customer → delete/edit staff | 403 |
| 15 | staff edits own profile | 200 |
| 16 | staff reads own bookings | 200 array |
| 17 | staff reads another staff member's bookings | 403 |
| 18 | admin reads any staff bookings | 200 |
| 19–20 | customer reads own / another user's favourites | 200 / 403 |
| 21–22 | customer adds favourite to self / to another user | 200 / 403 |
| 23–25 | wishlist add, read own, read another user's | 200 / 200 / 403 |
| 26–28 | feedback edit/delete of another user, edit own | 403 / 403 / 200 |
| 29–30 | foreign cancel / reschedule of a booking | 403 |
| 31–32 | customer assigns staff / admin assigns staff | 403 / 200 |
| 33 | booking config readable publicly | 200 |

### Booking rules
| # | Test | Expected |
|---:|---|---|
| 1 | missing required fields | 400 |
| 2 | date in the past | 400 |
| 3 | same-day booking inside advance window | 400 "in advance" |
| 4 | date beyond 30 days | 400 "days from today" |
| 5 | 4th booking on one day | 400 "Cannot create more than 3" |
| 6 | valid future booking | 200 |
| 7 | `GET /api/bookings/client` | only own bookings |
| 8 | another customer cancels it | 403 |

### Assistant
| # | Test | Expected |
|---:|---|---|
| 1 | engine exposed | `CriticalAIEngine.reply` is a function |
| 2–5 | intents `greet` / `pricing` / `book` / `services` | correct intent names |
| 6 | greeting reply | contains "rule-based" |
| 7 | pricing reply | contains `Le <amount>`, no `LKR` |
| 8 | unknown question | non-empty **and identical** on repeat (deterministic) |
| 9 | configured fallback | contains `+232 99 738064` |
| 10 | engine source | no ML framework / "neural network" references |
| 11 | service question | substantive answer |
| 12 | "I want to book…" | reply produced, session enters booking flow |
| 13 | config name | `Critical Assistant` |
| 14 | config tagline | mentions rule-based |

### Repository checks
| # | Test | Expected |
|---:|---|---|
| 1 | scan `.html/.js/.md/.gs/.css` | no `LKR`, Sri Lanka, Colombo, Kandy, Negombo, Jaffna |
| 2 | same scan | no `AI-first` / `Critical AI` |
| 3 | `docs/` | assistant, data/API, security and testing docs exist |

## Manual test checklist

Run against `index.html` opened from disk (`start index.html`).

| Area | Steps | Expected result |
|---|---|---|
| Landing | open `index.html` | hero, gallery, pricing, contact, assistant section render; currency shown as `Le …` |
| Registration | Login → create account with 8+ char password | account created, auto sign-in, redirected by role |
| Registration (short) | password `short1` | inline error, no account created |
| Admin sign-in | `admin@criticalshot.com` / `admin123` | lands on `admin.html`, dashboard stats visible |
| Admin guard | signed out, open `admin.html` | redirected to `login.html` |
| Role guard | sign in as customer, open `admin.html` | redirected to `index.html` |
| Bookings | customer → My Bookings | list, status badges, PDF export |
| Create booking | Book a session → valid future date | success toast, new row, price with `Le` |
| Booking rules | pick a past date / beyond 30 days / 4th same-day | clear validation message |
| Reschedule/cancel | own upcoming booking | works; 24-hour window respected |
| Staff dashboard | `staff@criticalshot.com` / `staff123` | assigned bookings only |
| Staff guard | customer opens `staff-dashboard.html` | redirected to `index.html` |
| Packages | admin create/edit/delete; public browse & customise | CRUD works, prices `Le` |
| Albums/portfolio | admin CRUD, public gallery | uploads, images, placeholders work |
| Feedback | customer with booking posts/edits own feedback | appears under "active"; cannot edit others |
| Wishlist/heart | heart a package, open wishlist | entry appears; own list only |
| Assistant | ask greeting, prices, services, "book a wedding shoot" | rule-based replies, price `Le`, collects fields, summary → confirm |
| Assistant submission | confirm the summary | "request received" with reference only after store succeeds; row in Admin → Leads |
| Storage reset | console → `CS_MOCK.reset()` | demo data restored |
| Security spot-check | console: `CS_MOCK.request('GET','/api/admin/bookings')` while signed in as customer | rejected with 403 |

## Known gaps

- The suite runs the data layer and the assistant engine; page rendering
  (DOM) is covered by the manual checklist above because the project has no
  DOM test runner and runs from `file://`.
- Google Sheets submission is exercised only when a real web-app URL is
  configured (`GOOGLE_SHEETS.md`); by default the endpoint is empty and the
  local submit path is used.
