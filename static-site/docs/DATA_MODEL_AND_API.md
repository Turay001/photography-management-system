# Data model & API reference

This project runs standalone in the browser: `js/db.js` exposes
`window.CS_MOCK.request(method, url, opts)` and reproduces the same API
contract the Spring Boot backend used. All data lives in one `localStorage`
key: `criticalshot_pms_db_v1`. `js/core.js` routes every `CS.api.*` call
through the mock when no backend is present.

## 1. Data model (collections)

### `users`
| Field | Type | Notes |
|---|---|---|
| `id` | string | e.g. `u-admin`, `u-cust`, `u<timestamp>` for new accounts |
| `name` | string | |
| `email` | string | unique, lower-case compared |
| `password` | string | **salted SHA-256**: `sha256$<salt>$<hex>` |
| `role` | string | `ADMIN` \| `STAFF` \| `CUSTOMER` |
| `contactNumber` | string | |
| `joinDate` | ISO date | |
| `favorites` | array | album ids |

### `staff`
| Field | Type | Notes |
|---|---|---|
| `id` | number | sequence `staff` |
| `name`, `email`, `phone`, `address` | string | `email` links to `users` |
| `experience` | string | years |
| `hourlyRate` | number | Le |
| `specialization` | string | |
| `availability` | boolean | |
| `availabilityStartDate` / `availabilityEndDate` | ISO date | |

### `packages`
`id`, `name`, `packageType`, `investment` (Le), `image`, `servicesIncluded[]`,
`additionalItems { editedImages, uneditedImages, thankYouCards, albums[],
framedPortraits[] }`.

### `albums`
`id`, `name`, `description`, `category`, `location`, `status`
(`active`/…), `releaseDate`, `coverImage`, `images[]`.

### `bookings`
| Field | Notes |
|---|---|
| `id` | sequence `booking` |
| `clientId` | owner (`users.id`) — drives ownership checks |
| `clientName`, `email`, `phoneNumber` | |
| `location` | one of the configured Sierra Leone locations |
| `packageName`, `price` | Le |
| `dateTime` | ISO `YYYY-MM-DDTHH:MM` |
| `bookingStatus` | `upcoming` \| `completed` \| `cancelled` |
| `paymentStatus` | `pending` \| `paid` |
| `assignedStaffId`, `assignedStaffName` | set by admin |
| `createdAt` | ISO |

### `feedbacks`
`id`, `clientId`, `clientName`, `clientEmail`, `content`, `rating`,
`packageName`, `createdAt`, `updatedAt`, `active` (soft delete), `reply`.

### `portfolio`
`id`, `albumName`, `description`, `photographerName`, `category`,
`imageUrl`, `dateUploaded`.

### `wishlist`
`id`, `userId`, `packageId`, `packageType`, `packageName`, `price`, `imageUrl`.

### `leads` (assistant booking intake)
`id`, `bookingId` (`CS-YYYYMMDD-####`), `name`, `phone`, `email`, `service`,
`shootType`, `eventDate`, `time`, `location`, `package`, `price`,
`requirements`, `status` (`New`), `conversationId`, `source`, `notes`,
`budget`, `message`, `createdAt`. Visible in **Admin → Leads**.

### `activities` (admin activity log)
`id`, `type`, `description`, `userName`, `timestamp`.

### `config` (booking rules)
`maxBookingsPerDay` (3), `minAdvanceBookingDays` (1),
`maxAdvanceBookingDays` (30), `cancellationWindowHours` (24),
`rescheduleWindowHours` (24).

### `seq`
Per-collection counters used to mint ids.

## 2. Authentication

There are no server cookies or JWTs in standalone mode. `js/pages/login.js`
stores `userId`, `email`, `role`, `token` in `sessionStorage`;
`js/core.js` attaches the signed-in id as a `Userid` header on **every**
request (`localReq`). The data layer reads that header — never the request
body — to decide who is calling.

Roles: `ADMIN`, `STAFF`, `CUSTOMER`.

## 3. API endpoints

Legend — **Auth**: `public` (anyone), `user` (any signed-in user),
`owner` (record owner or admin), `staff` (that staff member or admin),
`admin` (ADMIN only).

### Public
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | public | verify email + password, returns `{userId, role, email}` |
| POST | `/api/auth/register` | public | create `CUSTOMER` account (password ≥ 8 chars) |
| GET | `/api/bookings/config` | public | booking rules (read-only for pages) |
| GET | `/api/packages` | public | package list |
| GET | `/api/packages/:id` | public | single package |
| GET | `/api/albums` | public | album list |
| GET | `/api/albums/:id` | public | single album |
| GET | `/api/portfolio` | public | portfolio list |
| GET | `/api/portfolio/:id` | public | single portfolio item |
| GET | `/api/feedbacks/active` | public | published feedback (optional `?packageName=`) |
| POST | `/api/bookings` | public | assistant / landing booking intake (see note) |
| POST | `/api/customer-leads` | public | same handler as above |

> **Note on the public intake endpoint.** A visitor who has not signed in must
> still be able to ask for a quote, so this endpoint is deliberately open. It
> only accepts create operations, strips control characters, caps every field
> length, forces `status: 'New'` and writes into `leads` — it cannot modify
> existing records.

### Signed in (any role)
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/auth/profile/:id` | owner | read own profile |
| PUT | `/api/auth/profile/:id` | owner | update own name/email/phone |
| GET | `/api/bookings/client` | user | bookings of the signed-in client |
| POST | `/api/bookings/create` | user | create a booking (validates rules) |
| PUT | `/api/bookings/reschedule/:id` | owner | new date/time (window rules apply) |
| PATCH | `/api/bookings/cancel/:id` | owner | cancel own booking |
| GET | `/api/users/:id/favorites` | owner | favourite albums of that user |
| POST | `/api/users/:id/favorites/:albumId` | owner | add favourite |
| DELETE | `/api/users/:id/favorites/:albumId` | owner | remove favourite |
| GET | `/api/wishlist/user/:id` | owner | wishlist of that user |
| POST | `/api/wishlist/add` | user | adds for the **signed-in** user (body id ignored) |
| DELETE | `/api/wishlist/remove?userId=&packageId=` | owner | removes own entry |
| POST | `/api/feedbacks` | user | requires a non-cancelled booking |
| PUT | `/api/feedbacks/:id` | owner | edit own feedback |
| DELETE | `/api/feedbacks/:id` | owner | soft-delete own feedback |
| GET | `/api/staff/search?email=` | user | look up a staff record by email |
| GET | `/api/staff/:id` | staff | own profile |
| PUT | `/api/staff/:id` | staff | edit own profile |

### Staff self (or admin)
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/bookings/staff/:id` | staff | bookings assigned to that staff member |

### Admin only
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/dashboard/stats` | admin | dashboard counters |
| GET | `/api/dashboard/recent-activities` | admin | activity feed |
| PUT | `/api/bookings/config` | admin | change booking rules |
| GET | `/admin/bookings` | admin | all bookings |
| GET | `/admin/bookings/:id` | admin | one booking |
| PUT | `/admin/bookings/:id` | admin | update status/payment/notes |
| DELETE | `/admin/bookings/:id` | admin | delete a booking |
| PUT | `/api/bookings/:id/assign` | admin | assign staff to a booking |
| PUT | `/api/staff/assign/:staffId` | admin | assign staff to a booking (legacy path) |
| GET | `/api/staff` | admin | staff list |
| POST | `/api/staff` | admin | create staff (+ linked `STAFF` login) |
| DELETE | `/api/staff/:id` | admin | delete staff (+ linked login) |
| POST | `/api/packages` | admin | create package |
| PUT | `/api/packages/:id` | admin | update package |
| DELETE | `/api/packages/:id` | admin | delete package |
| POST | `/api/albums` | admin | create album |
| PUT | `/api/albums/:id` | admin | update album |
| DELETE | `/api/albums/:id` | admin | delete album |
| POST | `/api/portfolio` | admin | add portfolio item |
| PUT | `/api/portfolio/:id` | admin | update portfolio item |
| DELETE | `/api/portfolio/:id` | admin | delete portfolio item |

### Errors
Failures reject with `Error.message` and `status`:

| Status | Meaning |
|---|---|
| 400 | validation failure (missing field, bad date, rule violation) |
| 401 | no signed-in user (`Userid` header missing/unknown) |
| 403 | signed in, but not allowed (wrong role or not the owner) |
| 404 | record not found |
| 404 (endpoint) | unknown method/path |

## 4. Page → endpoint map

| Page file | Endpoints used |
|---|---|
| `js/pages/login.js` | `POST /api/auth/login`, `POST /api/auth/register` |
| `js/pages/profile*.js` | `GET/PUT /api/auth/profile/:id` |
| `js/pages/bookings.js` | `GET /api/bookings/client`, `PUT …/reschedule/:id`, `PATCH …/cancel/:id` |
| `js/pages/booking-create.js` | `GET /api/packages`, `GET /api/bookings/config`, `POST /api/bookings/create` |
| `js/pages/bookings-admin*.js` | `GET /admin/bookings`, `GET/PUT/DELETE /admin/bookings/:id`, `PUT /api/bookings/:id/assign` |
| `js/pages/bookings-config.js` | `GET/PUT /api/bookings/config` |
| `js/pages/staff*.js` | `GET /api/staff`, `POST/GET/PUT/DELETE /api/staff/:id`, `GET /api/bookings/staff/:id` |
| `js/pages/packages*.js` | `GET /api/packages`, `POST/PUT/DELETE /api/packages/:id` |
| `js/pages/albums*.js` | `GET /api/albums`, `POST/PUT/DELETE /api/albums/:id`, favourites |
| `js/pages/portfolio*.js` | `GET /api/portfolio`, `POST/PUT/DELETE /api/portfolio/:id` |
| `js/pages/feedback*.js` | `GET /api/feedbacks/active`, `POST/PUT/DELETE /api/feedbacks` |
| `js/pages/wishlist.js` | `GET /api/wishlist/user/:id`, `POST /api/wishlist/add`, `DELETE /api/wishlist/remove` |
| `js/pages/admin.js` | `GET /api/dashboard/stats`, `GET /api/dashboard/recent-activities` |
| `js/ai-chat-lib.js`, `js/pages/landing-booking.js` | `POST /api/bookings` (intake) |

## 5. Seeded demo data

Roles, packages, albums, portfolio, staff, bookings, feedback and activities
are seeded on first visit (see `seed()` in `js/db.js`). Locations and prices
are Sierra Leone specific (Freetown, Bo, Kenema, …; currency `Le`). Reset
everything with `CS_MOCK.reset()` in the browser console.
