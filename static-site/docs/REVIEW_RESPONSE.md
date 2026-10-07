# Response to code review

**Reviewer feedback:** *Abdul Rahman Kamara Code Review and AI Verification —
Photography Booking and Client Management System*
**Verdict received:** *"No genuine AI/ML implementation was found … the project
contains a rule-based frontend assistant … this is not sufficient to justify
'AI-powered' unless the title and report clearly describe it as rule-based AI
assistance."*

This document answers each point and points at the exact artefacts that
implement it.

---

## 1. Correcting the AI claim

**Review:** *"Change the project wording to 'AI-assisted/rule-based
photography booking assistant'."*

**Done.** The project no longer describes itself as AI-powered anywhere:

| Before | After |
|---|---|
| "AI-first landing", "Critical AI" | "landing", **Critical Assistant** |
| assistant described as AI | assistant described as **rule-based** in the hero copy, page titles, meta description, FAQ, nav label, config tagline and greeting |

Changed files: `index.html`, `ai-assistant.html`, `js/core.js` (nav label),
`js/business-data.js` (`name`, `tagline`, `greeting`), `js/ai-engine.js`,
`js/ai-chat-lib.js`, `js/landing-data.js`, `css/style.css`, `README.md`.

The suite scans the whole site for the phrases `AI-first` and `Critical AI`
and fails if they reappear (`tests/run-tests.js`, "Repository checks").

## 2. Evidence of the assistant logic

**Review:** *"Show how the chatbot processes user messages, what keywords it
recognizes, and how package recommendations are generated."*

**Documented in `docs/ASSISTANT_LOGIC.md`**, which includes:

- the full processing pipeline (`ai-chat-lib.js` → `CriticalAIEngine.reply`
  → intent/extract → rendered reply → `POST /api/bookings`);
- the complete **intent table** with every keyword/regex that triggers it
  (`greet`, `pricing`, `book`, `services`, `location`, `contact`, `hours`,
  `delivery`, `payment`, `confirm`, `edit`, `cancel`, …) taken directly from
  `js/ai-engine.js:213`;
- the entity extractors (`detectService`, `detectShootType`, `parseDateText`,
  `extract`) that pull service, shoot type, date, time, phone, email,
  location and package out of free text;
- the booking state machine
  (`idle → collecting → confirming → editing → submit`) with the required and
  optional field lists;
- how pricing is produced: prices come from the `services`, `priceGuide` and
  knowledge tables in `js/business-data.js` (not from a model), so package
  suggestions are a lookup over package data — i.e. exactly the rule-based
  behaviour the reviewer observed, now documented instead of implied.

Automated evidence: the "Rule-based assistant engine" group in
`tests/run-tests.js` (14 assertions: intent detection, deterministic replies,
`Le` pricing, fallback contact details, no ML references).

**Honest statement:** the prototype does **not** use machine learning or an
external AI model. It is a deterministic rule engine.

## 3. Frontend source code

**Review:** *"Provide the original frontend source code, not only the
compiled `.next` build … include app/components/pages source files,
`package.json`, and clear run instructions."*

This deliverable is a **plain-HTML/vanilla-JS** implementation, so there is no
compiled build to hide behind:

- every page is one readable `.html` file plus one controller in
  `js/pages/*.js` (see the page map in `README.md`);
- `README.md` → *How to run* gives two options (open `index.html`, or serve
  the folder) with no build step;
- the architecture tree in `README.md` lists every file and its purpose;
- there is no `node_modules` and no bundler output in the submission.

## 4. Data model & API documentation

**Review:** *"Document the database collections/models and API endpoints used
for bookings, packages, staff, feedback, users, albums/portfolio, wishlist,
and dashboard."*

**Done — `docs/DATA_MODEL_AND_API.md`:**

- every collection with its fields and types (`users`, `staff`, `packages`,
  `albums`, `bookings`, `feedbacks`, `portfolio`, `wishlist`, `leads`,
  `activities`, `config`, `seq`);
- every endpoint grouped by auth level (public / signed-in / owner /
  staff-self / admin) with a one-line purpose — 50+ routes, including all the
  ones the review lists;
- the page → endpoint map, and the error/status code table.

## 5. Testing evidence

**Review:** *"Add testing evidence: screenshots or tables for booking
creation, validation, rescheduling, cancellation, staff assignment, package
CRUD, user login/registration, and dashboard statistics."*

**Done — `tests/run-tests.js` + `docs/TESTING.md`:**

```bash
node tests/run-tests.js
```

`docs/TESTING.md` contains three tables: group summary, per-test expected
results (login/registration, authorization, booking rules, assistant,
repository checks) and a manual checklist that covers exactly the review's
list — booking creation, validation, rescheduling, cancellation, staff
assignment, package CRUD, login/registration and dashboard statistics — with
steps and expected results for each.

Latest run: **74 passed, 0 failed.**

## 6. Security

**Review:** *"Improve security: avoid relying only on simple session/profile
logic; document authentication, password handling, and authorization
checks."*

**Done — `docs/SECURITY.md`**, summarised:

| Area | Implementation |
|---|---|
| Password handling | salted SHA-256 (`sha256$<salt>$<hex>`), constant-time compare, ≥ 8 characters, one-time migration of legacy plain-text records; digest verified against Node `crypto` in tests |
| Authentication | `sessionStorage` session; `js/core.js` attaches the signed-in id as a `Userid` header on every request — identity is never taken from the request body |
| Authorization | two layers: page guards (`CS.auth.requireLogin/requireRole`) **and** data-layer guards in `js/db.js` (`requireUser` 401, `requireAdmin` 403, `ownsOrAdmin`, `staffSelfOrAdmin`) — a forgotten page guard cannot expose a protected action |
| Permission matrix | full role × action table in `docs/SECURITY.md`, each row covered by an automated test |
| Input/output safety | booking rule validation, field length caps, control-character stripping, `CS.esc()` HTML escaping on render |
| Known limitations | stated honestly (client-side storage, client-side KDF, no CSRF tokens yet) with the migration path to the real backend |

## 7. Currency / location mismatch

**Review:** *"the chatbot output references LKR, which does not match Sierra
Leone's currency."*

**Fixed everywhere.** All `LKR` values, Sri Lankan city names and
`Sri Lanka` references were replaced with Sierra Leone equivalents
(`Le`, Freetown, Bo, Kenema, Makeni, Port Loko, Lumley Beach, …) in pages,
page controllers, assistant knowledge, seed data and the Apps Script
template. The suite scans `.html/.js/.md/.gs/.css` files and fails on any
`LKR`, `Sri Lanka`, `Colombo`, `Kandy`, `Negombo` or `Jaffna` reappearing.

---

## 8. Revised title & report wording (as recommended)

**Recommended title**

> **Design and Implementation of a Photography Booking and Client Management
> System with a Rule-Based Digital Assistant**

**Recommended report wording**

> The system includes a rule-based assistant that helps users view packages,
> understand pricing, request customization options, and receive simple
> package suggestions. The assistant uses predefined responses, keyword
> matching, and package data from the system. It does not use machine
> learning or an external AI model in the current prototype.

**Suggested abstract wording for the report**

> This project is the design and implementation of a photography booking and
> client management system for Critical Shot (Sierra Leone). It covers
> package management, bookings with scheduling rules, staff assignment,
> albums and portfolio, feedback, wishlist and dashboard reporting. The
> customer-facing conversation feature is a *rule-based digital assistant*
> implemented in plain JavaScript: it matches keywords and regular
> expressions, extracts booking details from natural language, and guides the
> customer through a booking form before submitting it to the same backend
> used by the booking page. All replies come from predefined answers,
> keyword tables and package data stored in `js/business-data.js`; no
> machine-learning model, external AI service or API key is involved.
> Recommendations are produced by looking up package data (price, type and
> services), not by prediction. The assistant can later be upgraded to a
> learned model without changing the booking flow, because the intake,
> validation and storage layers are already separated.

**Wording to avoid:** "AI-powered", "AI-first", "machine learning",
"neural network", "predictive AI" — `tests/run-tests.js` fails the build if
`AI-first` or `Critical AI` reappears in the site source.
