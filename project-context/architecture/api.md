# API

## Conventions
- Base path `/api`. JSON only.
- Property names are **snake_case**. Enums are sent as their names (`"VIDEO_CONFERENCE"`).
- Date-times are ISO 8601 **UTC** instants with `Z` (`"2026-11-02T02:00:00Z"`). Calendar dates are `YYYY-MM-DD` and mean a day in the office time zone (BR-4).
- Request header `X-User-Id: <user id>` identifies the acting user. The web app sends it on every request; `POST /api/bookings` and the admin endpoints use it. An endpoint that acts on behalf of a user reads it with `@RequestHeader(name = "X-User-Id", required = false) Long userId` and answers `401` ProblemDetail ("Unknown user") when it is missing or not a known user id. Admin-only endpoints (`/api/admin/**`) call `UserService.requireAdmin`, which also answers `403` for a user who is not `ADMIN` (BR-6, BR-10).
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
Books an active room for the acting user (`X-User-Id`). BR-2, BR-3, BR-7, BR-8. Overlapping bookings are still accepted (RMB-2).

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

Checks run in this order: the user (`401`), then Bean Validation of the body (missing fields, title; run in `BookingService`, not with `@Valid`, so an unknown caller gets no field feedback), then the room (`404`), then the time rules. A body that is not valid JSON is still answered with `400` before the user check.

## Admin endpoints — rooms (RMB-4)
All require `X-User-Id` of an `ADMIN` (BR-10). Common errors:

| Case | Status | `detail` |
|---|---|---|
| `X-User-Id` missing or not a known user | 401 | `Unknown user` |
| Acting user is not an admin | 403 | `Only admins can manage rooms.` |
| Unknown room id in the path | 404 | `Room <id> not found.` |

An admin room has the fields of `GET /api/rooms` plus `upcoming_bookings`: the number of bookings of the room that start after the current time (injected `Clock`).

```json
{"id":1,"name":"Ha Long","capacity":12,"equipment":["TV","WHITEBOARD","VIDEO_CONFERENCE"],"active":true,"upcoming_bookings":2}
```

### `GET /api/admin/rooms`
All rooms, in service (`active` true) and out of service, ordered by name.

### `POST /api/admin/rooms` → `201`
Body `{"name":"  Nha Trang  ","capacity":10,"equipment":["TV","WHITEBOARD"]}`. Creates a room in service; answers the created admin room (`name` trimmed, `upcoming_bookings` 0).

### `PUT /api/admin/rooms/{id}` → `200`
Same body as `POST`. Changes name, capacity and equipment; never `active`. Answers the updated admin room.

Body validation (BR-9) for `POST` and `PUT`: `400` with `errors` entries; nothing is stored.

| Field | Case | `message` |
|---|---|---|
| `name` | missing, empty or only spaces | `must not be blank` |
| `name` | more than 50 characters after trimming | `must be at most 50 characters` |
| `capacity` | missing | `must not be null` |
| `capacity` | below 1 or above 100 | `must be between 1 and 100` |
| `equipment` | missing (`[]` is valid) | `must not be null` |

An unknown equipment value (e.g. `"PROJECTOR"`) and a fractional capacity (e.g. `2.5`) are a `400` without `errors` (the body cannot be read; for every endpoint, Jackson rejects a fractional number for an integer property: `spring.jackson.deserialization.accept-float-as-int=false`). A name equal to another room's name ignoring letter case and surrounding spaces answers `409` `A room named "<existing name>" already exists.`; a room may change the letter case of its own name. When two saves of the same name race, the unique index `rooms_name_key_idx` rejects the second one, which is answered with the same `409` and detail (the existing room's name is read in a new transaction).

Checks run in this order: the acting user (`401` / `403`; checked for every `/api/admin/**` request by `AdminAccessInterceptor` (registered in `common/WebConfig`) before the body is read, so a non-admin gets `401` / `403` also for a body that is not valid JSON or has an unknown equipment value), then reading the body (`400`), then Bean Validation of the body (run in `RoomAdminService`, not with `@Valid`), then the room id (`404`, `PUT`), then the name (`409`).

### `POST /api/admin/rooms/{id}/deactivate` → `200`
Takes the room out of service and deletes its bookings that start after now; bookings that started at or before now are kept (BR-11).

```json
{"room":{"id":1,"name":"Ha Long","capacity":12,"equipment":["TV","WHITEBOARD","VIDEO_CONFERENCE"],"active":false,"upcoming_bookings":0},"cancelled_bookings":2}
```

`409` `Room <id> is already out of service.` when it is; nothing changes.

### `POST /api/admin/rooms/{id}/activate` → `200`
Puts the room back into service and answers the admin room (`active` true). Cancelled bookings are not restored. `409` `Room <id> is already in service.` when it is.
