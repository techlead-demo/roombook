# API

## Conventions
- Base path `/api`. JSON only.
- Property names are **snake_case**. Enums are sent as their names (`"VIDEO_CONFERENCE"`).
- Date-times are ISO 8601 **UTC** instants with `Z` (`"2026-11-02T02:00:00Z"`). Calendar dates are `YYYY-MM-DD` and mean a day in the office time zone (BR-4).
- Request header `X-User-Id: <user id>` identifies the acting user. The web app sends it on every request; `POST /api/bookings` uses it. An endpoint that acts on behalf of a user reads it with `@RequestHeader(name = "X-User-Id", required = false) Long userId` and answers `401` ProblemDetail ("Unknown user") when it is missing or not a known user id.
- Errors: RFC 7807 `ProblemDetail`, content type `application/problem+json`:

```json
{"detail":"Invalid value '2026-13-45' for parameter 'date'.","instance":"/api/rooms/availability","status":400,"title":"Bad Request"}
```

  `type` is omitted when it is `about:blank`; extra properties may be added with `ProblemDetail.setProperty`. Request-body validation errors are `400` with detail "Request validation failed." and an extra `errors` array: `"errors":[{"field":"start_at","message":"must not be null"}]`. `field` is the JSON (snake_case) property name. Both `@Valid` failures and rules checked in a service (throw `common.FieldValidationException`) use this shape. Unknown paths return `404` ProblemDetail; unexpected failures `500` with detail "An unexpected error occurred.".

## Endpoints

### `GET /api/users`
All users, ordered by name.

```json
[
  {"id":1,"name":"An Nguyen","email":"an.nguyen@roombook.local","role":"ADMIN"},
  {"id":2,"name":"Binh Tran","email":"binh.tran@roombook.local","role":"EMPLOYEE"}
]
```

### `GET /api/rooms`
Active rooms ordered by name (BR-1). `equipment` is sorted in the order TV, WHITEBOARD, VIDEO_CONFERENCE.

```json
[
  {"id":4,"name":"Da Lat","capacity":4,"equipment":["WHITEBOARD"],"active":true},
  {"id":1,"name":"Ha Long","capacity":12,"equipment":["TV","WHITEBOARD","VIDEO_CONFERENCE"],"active":true}
]
```

### `GET /api/rooms/availability?date=YYYY-MM-DD`
Busy intervals of every active room (ordered by room name) for one office day.

| Parameter | Required | Format | Meaning |
|---|---|---|---|
| `date` | yes | `YYYY-MM-DD` | Calendar day in the office time zone |

`day_start` and `day_end` are the UTC instants of the office-time midnights that bound the day. `busy` lists every booking of the room that overlaps the day (`start_at < day_end` and `end_at > day_start`), ordered by `start_at`, with its real start and end (not clipped to the day). A room without bookings has `"busy": []`.

```json
{
  "date": "2026-11-02",
  "time_zone": "Asia/Ho_Chi_Minh",
  "day_start": "2026-11-01T17:00:00Z",
  "day_end": "2026-11-02T17:00:00Z",
  "rooms": [
    {"room_id": 4, "busy": [{"start_at": "2026-11-02T04:00:00Z", "end_at": "2026-11-02T05:15:00Z"}]},
    {"room_id": 1, "busy": [
      {"start_at": "2026-11-02T02:00:00Z", "end_at": "2026-11-02T03:00:00Z"},
      {"start_at": "2026-11-02T07:00:00Z", "end_at": "2026-11-02T08:30:00Z"}
    ]},
    {"room_id": 5, "busy": []}
  ]
}
```

Errors:
| Case | Status | `detail` |
|---|---|---|
| `date` missing | 400 | `Required parameter 'date' is not present.` |
| `date` not a valid `YYYY-MM-DD` date | 400 | `Invalid value '<value>' for parameter 'date'.` |

### `POST /api/bookings`
Books an active room for the acting user (`X-User-Id`). BR-2, BR-3, BR-7, BR-8, BR-12 (no overlap with any existing booking of the same room).

Request (`title` is stripped of leading and trailing spaces before it is checked and stored):
```json
{"room_id":1,"title":"Sprint planning","start_at":"2026-11-02T04:00:00Z","end_at":"2026-11-02T05:00:00Z"}
```

Response `201 Created` (`created_at` from the injected `Clock`):
```json
{"id":8,"room_id":1,"user_id":2,"title":"Sprint planning","start_at":"2026-11-02T04:00:00Z","end_at":"2026-11-02T05:00:00Z","created_at":"2026-11-02T01:07:00Z"}
```

Errors (nothing is stored):
| Case | Status | `detail` / `errors` |
|---|---|---|
| `X-User-Id` missing or not a known user | 401 | `Unknown user` |
| `room_id` unknown or of an inactive room | 404 | `Room <room_id> not found.` |
| `room_id`, `start_at` or `end_at` missing | 400 | that field: `must not be null` |
| `title` missing, empty or only spaces | 400 | `title`: `must not be blank` |
| `title` longer than 100 characters after trimming | 400 | `title`: `must be at most 100 characters` |
| `start_at` / `end_at` not on a 15-minute step (office time, zero seconds) | 400 | that field: `must be on a 15-minute step` |
| `end_at` equal to or before `start_at` | 400 | `end_at`: `must be after start_at` |
| `start_at` before now (a start equal to now is accepted) | 400 | `start_at`: `must not be in the past` |
| Overlaps an existing booking of the room (`start_at < existing.end_at` and `end_at > existing.start_at`; back-to-back is allowed) | 409 | `<room> is already booked from 09:00 to 10:00 on Mon 2 Nov 2026. Choose another time or another room.` — the earliest-starting conflicting booking, office time; when it starts and ends on different office days: `<room> is already booked from 22:00 on Mon 2 Nov 2026 to 01:00 on Tue 3 Nov 2026. Choose another time or another room.` |

Checks run in this order: the user (`401`), then Bean Validation of the body (missing fields, title; run in `BookingService`, not with `@Valid`, so an unknown caller gets no field feedback), then the room (`404`), then the time rules, then the overlap (`409`). The room row is locked (`SELECT … FOR UPDATE`) from the room check until the transaction ends, so concurrent requests for the same room are checked one after the other and only one of two overlapping requests is stored. A body that is not valid JSON is still answered with `400` before the user check.
