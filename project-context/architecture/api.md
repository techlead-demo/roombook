# API

## Conventions
- Base path `/api`. JSON only.
- Property names are **snake_case**. Enums are sent as their names (`"VIDEO_CONFERENCE"`).
- Date-times are ISO 8601 **UTC** instants with `Z` (`"2026-11-02T02:00:00Z"`). Calendar dates are `YYYY-MM-DD` and mean a day in the office time zone (BR-4).
- Request header `X-User-Id: <user id>` identifies the acting user. The web app sends it on every request; no endpoint uses it yet. An endpoint that acts on behalf of a user reads it with `@RequestHeader("X-User-Id") Long userId` and answers `401` ProblemDetail ("Unknown user") when it is missing or not a known user id.
- Errors: RFC 7807 `ProblemDetail`, content type `application/problem+json`:

```json
{"detail":"Invalid value '2026-13-45' for parameter 'date'.","instance":"/api/rooms/availability","status":400,"title":"Bad Request"}
```

  `type` is omitted when it is `about:blank`; extra properties may be added with `ProblemDetail.setProperty`. Request-body validation errors (`@Valid`) are `400` with an extra `errors` array: `"errors":[{"field":"title","message":"must not be blank"}]`. Unknown paths return `404` ProblemDetail; unexpected failures `500` with detail "An unexpected error occurred.".

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
