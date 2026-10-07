# Critical Assistant — how the rule-based assistant works

> **Honest description.** The assistant in this project is a *deterministic,
> rule-based* conversation engine written in plain JavaScript. It does **not**
> use machine learning, neural networks, LLMs, or any external AI API. Every
> reply is produced by keyword matching, regular-expression extraction and
> text stored in configuration files. It is therefore best described as an
> **AI-assisted / rule-based photography booking assistant**, not as an
> artificial-intelligence model.

## Files

| File | Role |
|---|---|
| `js/business-data.js` | Single source of knowledge: services + prices, FAQ, price guide, greeting/fallback copy, booking fields, behaviour config (rate limit, message caps, Sheets endpoint). Exposed as `window.CRITICAL_AI_CONFIG`. |
| `js/ai-engine.js` | The engine (`window.CriticalAIEngine`). Pure logic, no DOM: intent detection, entity extraction, the booking state machine, payload building, local + Google Sheets submission. |
| `js/ai-chat-lib.js` | The UI (`CS.Assistant(mount, opts)`): inline chat widget, floating launcher, full-screen overlay, draft/history persistence, rate limiting, message rendering. |
| `js/pages/ai-assistant.js` | Controller for the dedicated `ai-assistant.html` page. |
| `js/core.js` | Loads the three assistant scripts on pages that do not embed them and mounts the launcher. |

## How a message is processed

```
user text
   │
   ▼
js/ai-chat-lib.js   trims/limits the message (max length from config)
   │
   ▼
CriticalAIEngine.reply(text, session)
   │
   ├─ session.mode === 'confirming' ?  ──► confirm / edit / cancel branch
   ├─ session.mode === 'collecting'  ?  ──► extract() fills missing fields,
   │                                         then nextQuestion() asks the next one
   └─ otherwise (idle)               ?  ──► intent(text) → answer table
   │
   ▼
{ reply, action, session, summary }
   │
   ▼
js/ai-chat-lib.js   renders the text; 'submit' action posts to POST /api/bookings
```

## Intent detection (keyword rules)

`intent(text)` in `js/ai-engine.js:213` runs a fixed, ordered list of regular
expressions over the lower-cased message. First match wins:

| Intent | Matched keywords (examples) | Reply source |
|---|---|---|
| `greet` | hello, hi, hey, good morning/afternoon/evening, greetings | greeting copy (mentions it is rule-based) |
| `howareyou` | how are you, what's up | fixed small talk |
| `thanks` | thanks, appreciate, perfect | fixed reply |
| `bye` | bye, goodbye, see you | fixed reply |
| `capabilities` | what can you do, help, who are you | capability list |
| `location` | where are you, studio located | configured studio address |
| `contact` | contact, phone number, whatsapp, email you | configured phone/email |
| `hours` | opening hours, when are you open | configured business hours |
| `delivery` | delivery time, turnaround, when will I receive | configured delivery facts |
| `book` | book, reserve, schedule, availability | starts the booking state machine |
| `pricing` | price, how much, cost, quote, rates | price list from `business-data.js` |
| `services` | service, what do you offer | service list from `business-data.js` |
| `payment` | payment, deposit, paid, bank | payment policy |
| `confirm` | yes book, looks good, go ahead, submit | confirms the shown summary |
| `edit` | change, update, amend, modify | switches to editing mode |
| `cancel` | cancel, never mind, start over | clears the draft |
| `yes` / `no` | exact matches | summary answers |
| `knowledge` (fallback) | anything else | topic regexes (wedding, drone, video, event, portrait, corporate) → FAQ → capability prompt → configured fallback with the studio phone number |

Supporting logic:

- `detectService(text)` — maps free text to a configured service record
  (name, keywords, starting price).
- `detectShootType(text)` — maps text to a shoot type (wedding, birthday,
  portrait, corporate, product, …).
- `parseDateText(text)` — parses explicit dates (`12 June`, `12/06/2026`,
  `next Saturday`, `tomorrow`) into a normalised date.
- `extract(text, data)` — pulls phone numbers, emails, times, people counts,
  locations and package names out of a sentence and stores them in the
  booking draft.

## Booking state machine

```
idle ── booking signal ──► collecting ── all required fields ──► confirming
  ▲                            │                                  │  │  │
  └─────── cancel ─────────────┘            edit ◄────────────────┘  │  │
                                                                     │  └─ confirm ─► submit ─► POST /api/bookings
                                                                     └──── change ──► editing ─► back to confirming
```

- Required fields: `name`, `phone`, `service`, `eventDate`, `location`.
- Optional fields: `email`, `shootType`, `time`, `people`, `packageName`,
  `requirements` (asked once each, skippable with "skip"/"none"/"not sure").
- Questions are stored in the `QUESTIONS` table and asked in `FIELD_ORDER`.
- When every required field is present the engine renders a **summary** with
  a starting price and asks the visitor to confirm, edit or cancel.
- On confirm it builds the 16-column payload (`buildPayload`) with a
  sequential reference (`CS-YYYYMMDD-####`), status `New` and a per-conversation
  id, then submits it.

## Submission is honest

- The booking is written through the same backend as the booking form:
  `POST /api/bookings` (standalone mock `js/db.js`, or the Google Apps Script
  web app when configured).
- The visitor only sees *"request received — the team will confirm"* **after**
  the backend accepted the row, with the returned reference. A failed save
  keeps the draft and offers Retry — success is never claimed in advance.
- A configurable cooldown (`CRITICAL_AI_CONFIG.config.rateLimitSeconds`)
  prevents repeated submissions from one session.

## Configuration

Everything the assistant knows lives in `js/business-data.js`:

- `assistant` — name, tagline, greeting, fallback, suggested prompts.
- `services` / `priceGuide` / `knowledge` — services, prices, FAQ answers.
- `booking.sheetColumns` — the 16 canonical booking columns.
- `config` — rate limit, message length caps, storage keys, Sheets endpoint,
  launcher visibility.

Editing that file changes the assistant's knowledge without touching code.
No API key, model file or network service is required for the assistant to
work.

## Verifying the claims

`tests/run-tests.js` asserts that the engine detects the documented intents,
answers pricing questions in Sierra Leone Leone (`Le`), keeps replies
deterministic, contains no machine-learning references and that the configured
fallback exposes the studio phone number. See `docs/TESTING.md`.
