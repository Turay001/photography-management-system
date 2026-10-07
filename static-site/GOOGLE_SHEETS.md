# Critical Assistant → Google Sheets booking backend

Critical Assistant submits bookings through a **server-side backend** (a Google Apps
Script web app). The booking is only reported to the customer as
*successfully received* **after** that backend confirms it wrote the row to
your Google Sheet. No Google credentials, keys or tokens ever appear in the
frontend.

```
USER → Critical Assistant (collects details, summary, Confirm) → POST /api/bookings
    → Apps Script backend (validate → sanitize → dedupe → write)
    → Google Sheet "Critical Shot Bookings" / tab "Bookings"
    → {"ok":true,"bookingId":"CS-20260920-0001"} → AI: request received
```

The standalone static site also exposes the same `POST /api/bookings` route
via `js/db.js` so the demo works with **no** Google account — see the
"standalone vs. connected" note below.

---

## What is stored

**Google Sheet:** `Critical Shot Bookings`
**Worksheet (tab):** `Bookings` (created automatically if missing)

| # | Column | # | Column |
|---|---|---|---|
| 1 | Booking ID | 9 | Event Time |
| 2 | Date Submitted | 10 | Location |
| 3 | Customer Name | 11 | Package |
| 4 | Phone/WhatsApp | 12 | Price |
| 5 | Email | 13 | Requirements |
| 6 | Service | 14 | Status (= `New`) |
| 7 | Shoot Type | 15 | AI Conversation ID |
| 8 | Event Date | 16 | Notes |

Booking IDs are sequential per day, e.g. `CS-20260920-0001`, `CS-20260920-0002`.

---

## Files

| File | Purpose |
| --- | --- |
| `google-apps-script/gs-sheet-submit.gs` | The backend web app to deploy to your Google account |
| `js/business-data.js` | `CRITICAL_AI_CONFIG.config.sheetsEndpoint` → web-app URL |
| `js/bookings.js` (engine) | builds payload, calls `/api/bookings` |
| `js/db.js` | standalone `/api/bookings` implementation (no Google required) |

---

## Setup

### 1. Create the Sheet

- Create a new Google Sheet and name it **Critical Shot Bookings**.
- You can leave the first tab empty. The backend auto-creates and names the
  worksheet **Bookings**, writes the frozen header row, and styles it.

### 2. Deploy the Apps Script backend

- In the Sheet: **Extensions → Apps Script**.
- Delete `function myFunction(){}`, paste `gs-sheet-submit.gs`.
- Run `setProp` once for each secret (or use Project Settings → Script
  properties). These live **server-side**:

```js
setProp('SHEET_ID',   '1AbCdEfGhIjKlMnOpQrStUvWxYz...');  // from the sheet URL
setProp('SHEET_NAME', 'Bookings');                        // exact tab name
```

  `SHEET_ID` is the long token in the spreadsheet URL between `/d/` and
  `/edit`. Verify with `configStatus()` (it only prints whether values are
  present — never the values).

- **Deploy → New deployment → Web app**
  - Execute as: **Me**
  - Who has access: **Anyone**
- Copy the web-app URL (ends in `/exec`).

### 3. Point Critical Assistant at the backend

In `static-site/js/business-data.js`:

```js
config: {
  sheetsEndpoint: 'https://script.google.com/macros/s/AKfycb.../exec',
  ...
}
```

Save and reload. When this is set, Critical Assistant only reports success after the
backend confirms the row landed in Google Sheets.

---

## How the two modes behave

| Mode | What the customer sees on success | Honesty guarantee |
| --- | --- | --- |
| `sheetsEndpoint` **set** | *"Your booking request has been successfully received. Our team will review the details and contact you to confirm availability."* + reference | Success is only claimed after the backend writes to Sheets. On backend failure → safe error + Retry, nothing claimed as submitted. |
| `sheetsEndpoint` **empty** (standalone demo) | same message, plus *(recorded in the studio log)* | Works from `file://`, stores in `localStorage` (`criticalshot_pms_db_v1`). |

---

## Security notes

- The browser sends **no** Google secret — the Apps Script project executes
  with *your* Google authorization server-side.
- Required secrets (`SHEET_ID`, `SHEET_NAME`) live in Apps Script
  **Script Properties** (the server-side secret store), not in frontend JS or
  `.env` shipped to browsers.
- The web app **validates and sanitizes** every field (name/phone/email/date/
  location/price formats, length caps, control-char stripping) before writing.
- `Status` is always forced to `New` — a request is never made to look like a
  confirmed booking.
- **Duplicate protection:** a retry of the same conversation within 6 hours is
  detected (CacheService) and answered idempotently — no double rows. A
  20-second per-conversation cooldown blocks spam.
- Appending is serialized with `LockService` so concurrent submissions don't
  collide on the ID sequence or the sheet.
- **Error handling:** technical failures are logged server-side with
  `console.error` (Stackdriver). The client only ever receives
  `{ok:false, message:"...please try again"}` — never a stack trace. The chat
  then shows a safe error + **Retry** and keeps the draft.

### Limitations to be aware of

- Apps Script web apps cannot read request headers, so the backend cannot
  filter by `Origin`. The per-conversation cooldown, booking-ID idempotency,
  and the client-side 20 s rate limit are the practical anti-spam controls.
- Anyone who has the `/exec` URL can POST (they cannot read your Sheet —
  writes only, executed as you). Keep the URL private.
- For stronger protection later, put the web app behind a reverse proxy or run
  the equivalent `POST /api/bookings` logic in your own server with `.env`
  credentials (structure is identical).

---

## Request / response contract

Request (`Content-Type: text/plain;charset=utf-8`):

```json
{
  "action": "appendBooking",
  "booking": {
    "name": "John Kamara", "phone": "099123456", "email": "john@example.com",
    "service": "Birthday Photoshoot", "shootType": "Birthday",
    "eventDate": "2026-09-25", "time": "4:00 PM", "location": "Freetown",
    "packageName": "Standard", "price": "1500",
    "requirements": "Outdoor photos", "conversationId": "ai-k3x9..."
  }
}
```

Responses:

```json
{ "ok": true, "bookingId": "CS-20260920-0001", "reference": "CS-20260920-0001" }
{ "ok": false, "duplicate": true, "bookingId": "CS-20260920-0001" }
{ "ok": false, "retryLater": true, "message": "Thanks for your patience — give me a few seconds and try again." }
{ "ok": false, "message": "Some booking details are missing or invalid — please review and try again." }
{ "ok": false, "message": "The booking could not be stored right now. Please try again shortly." }
```

---

## Verification (manual)

1. Deploy, set `sheetsEndpoint`, reload the site.
2. Open Critical Assistant → “I want to book a birthday shoot”.
3. Answer the questions it asks (it only asks for what's missing).
4. Confirm the summary → **Confirm Booking**.
5. Chat shows the loading spinner, then the *successfully received* message
   with the reference.
6. Open *Critical Shot Bookings* → *Bookings* tab → a new row is there with
   `Status = New` and `Booking ID = CS-<today>-000 …`.
7. **Failure drill:** stop serving the sheet (or deploy a wrong URL), try a
   booking, confirm. Verify: safe generic error, **nothing claimed as
   submitted**, your draft is intact, **Retry** works once the URL is fixed.
8. Duplicate drill: re-confirm the same conversation — you should **not** get
   a second row (idempotent response).

Server-side you can watch `CS_BOOKING_OK / CS_BOOKING_VALIDATION /
CS_BOOKING_ERROR` in Apps Script → **Executions / Stackdriver** logs.