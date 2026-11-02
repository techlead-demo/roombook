---
issue: RMB-6
title: Booking limits per employee
type: story
status: draft
version: 1
design: [project-context/design/screens/booking-form.html]
business_rules: [BR-2, BR-3, BR-6, BR-7, BR-8, BR-12, BR-13]
---

# RMB-6 Booking limits per employee

## Summary
New bookings are limited so that rooms are shared fairly: a booking can last at most 4 hours, and a user can hold at most 5 upcoming bookings at a time. Both limits are checked by the API for every new booking and shown on the booking form.

## Background
RMB-1 (Done, `specs/RMB-1/spec.md`) added making a booking through the booking form and `POST /api/bookings`, without any limit (RMB-1 A-2). The booking-form mockup already has the "booking too long" state for this story. The office admin asked for the two limits; the values are "4 hours" and "5 upcoming bookings" ("for now", see A-1).

## Scope
- In scope:
  - Maximum booking duration of 4 hours (BR-12), checked in the booking form and in `POST /api/bookings`.
  - Maximum of 5 upcoming bookings per user (BR-13), checked in `POST /api/bookings` and shown on the booking form as a server error.
- Out of scope:
  - A screen or API for admins to change the limit values (see A-1).
  - Exempting admins or single users from the limits (see A-2).
  - Changing, cancelling or listing one's bookings (RMB-3); showing how many upcoming bookings a user has left.
  - Applying the limits to bookings that already exist (see A-4).
  - Overlap check (RMB-2), office hours and holidays (RMB-8).

## User stories
- As an office admin, I want to limit how long a booking can be and how many upcoming bookings one employee can hold, so that rooms are shared fairly.

## Acceptance criteria
Example values assume the seed data (room 1 "Ha Long"; user 1 "An Nguyen", role `ADMIN`; user 2 "Binh Tran", role `EMPLOYEE`) and a current time of Mon 2 Nov 2026 08:07 office time (`2026-11-02T01:07:00Z`) from the injected clock. "Upcoming" means a booking whose start is after the current time (glossary).

Maximum duration — booking form
- **AC-1** Given the booking form with room Ha Long, date 2026-11-03, start 09:00, end 13:00 (exactly 4 hours) and title "Workshop", when the user clicks "Book room", then the booking is made and the room list shows "Booked Ha Long, Tue 3 Nov 2026, 09:00–13:00."
- **AC-2** Given the booking form with date 2026-11-03, start 09:00 and end 13:15 (4 hours 15 minutes), when the user clicks "Book room", then End shows "A booking can be at most 4 hours.", the inputs are kept, no request is sent and nothing is stored. The same happens for start 09:00 and end 14:00, as in the mockup.
- **AC-3** Given start 11:00 and end 10:00, when the user clicks "Book room", then End shows only "End must be after start." (RMB-1 AC-12), not the duration message.

Maximum duration — API `POST /api/bookings`
- **AC-4** Given header `X-User-Id: 2` and an otherwise valid body with `start_at` "2026-11-03T02:00:00Z" and `end_at` "2026-11-03T06:00:00Z" (4 hours), when it is posted, then the response is `201`.
- **AC-5** Given an otherwise valid body with `start_at` "2026-11-03T02:00:00Z" and `end_at` "2026-11-03T06:15:00Z" (4 hours 15 minutes), when it is posted, then the response is `400` ProblemDetail with detail "Request validation failed." and an `errors` entry `{"field":"end_at","message":"must be at most 4 hours after start_at"}`, and nothing is stored.
- **AC-6** Given a body with `start_at` "2026-11-03T14:00:00Z" and `end_at` "2026-11-03T19:00:00Z" (22:00 to 02:00 office time, crossing midnight, 5 hours), when it is posted, then it is rejected as in AC-5: the duration is measured from start to end regardless of office days.

Maximum upcoming bookings — API `POST /api/bookings`
- **AC-7** Given Binh Tran (user 2) has 4 upcoming bookings (in any rooms), when a valid booking for 2026-11-04 09:00–10:00 is posted with `X-User-Id: 2`, then the response is `201`, and Binh Tran now has 5 upcoming bookings.
- **AC-8** Given Binh Tran has 5 upcoming bookings, spread over at least two rooms, when another otherwise valid booking is posted with `X-User-Id: 2`, then the response is `409` ProblemDetail with detail "You already have 5 upcoming bookings. A user can hold at most 5 upcoming bookings." and nothing is stored.
- **AC-9** Given Binh Tran has 5 bookings of which 1 started at 08:00 on 2026-11-02 (in progress at 08:07) and 4 start later, when another valid booking is posted with `X-User-Id: 2`, then the response is `201`: a booking that has started or ended does not count.
- **AC-10** Given An Nguyen (user 1, role `ADMIN`) has 5 upcoming bookings, when another valid booking is posted with `X-User-Id: 1`, then the response is `409` with the detail of AC-8: the limit applies to admins too.
- **AC-11** Given Binh Tran has 5 upcoming bookings and other users each have fewer than 5, when another user (e.g. user 1 with 0 upcoming bookings) posts a valid booking, then the response is `201`: the count is per user.
- **AC-12** Given Binh Tran has 5 upcoming bookings and posts a booking that also breaks another rule (e.g. 5 hours long, or `start_at` in the past), when it is posted, then the response is the `400` validation error of that rule, not the `409`: the upcoming-bookings check runs after all other checks.
- **AC-13** Given Binh Tran had 5 upcoming bookings and one of them was deleted (e.g. its room was taken out of service, BR-11), when another valid booking is posted, then the response is `201`.

Maximum upcoming bookings — booking form
- **AC-14** Given the acting user is Binh Tran with 5 upcoming bookings and the form has room Ha Long, date 2026-11-04, start 09:00, end 10:00, title "1:1", when the user clicks "Book room", then the alert "You already have 5 upcoming bookings. A user can hold at most 5 upcoming bookings." is shown above the form (as for other server errors, RMB-1 AC-16), the inputs are kept and no success message is shown.

## Business rules
- Existing: BR-2 (15-minute steps), BR-3 (end after start), BR-6 (roles), BR-7 (no start in the past), BR-8 (booking by the acting user), BR-11 (deleted bookings when a room goes out of service).
- New **BR-12** A booking lasts at most 4 hours: its end is at most 4 hours after its start.
- New **BR-13** A user can hold at most 5 upcoming bookings, across all rooms. A new booking is refused when the acting user already has 5 upcoming bookings. Bookings that have started or ended do not count. The limit applies to every user, admins included.

## UI
### Booking form — `project-context/design/screens/booking-form.html`
- State "error — booking too long" is now implemented: field error "A booking can be at most 4 hours." under End (`.field.invalid` + `.field-error`), checked in the form before sending (AC-2). When the end is not after the start, only "End must be after start." is shown (AC-3).
- Upcoming-bookings limit: no own mockup state; it uses the existing server-error alert above the form (`.alert-danger`, as in the "overlaps an existing booking" state and RMB-1 AC-16) with the ProblemDetail `detail` of AC-8 as text (AC-14).
- No new fields, labels or screens. No wireframe is needed.
- Differences from the mockup: none beyond those already listed in RMB-1 (header navigation, "overlaps" state for RMB-2).

## Data and API impact
- Data: no schema change expected. The limit values (4 hours, 5 bookings) are product settings, not data an admin edits (A-1).
- API: `POST /api/bookings` gets two new errors: `400` with `end_at`: `must be at most 4 hours after start_at` (with the other time rules), and `409` with the detail of AC-8 (after all other checks). Update `project-context/architecture/api.md` (errors table and check order).

## Assumptions
- A-1 The limits are fixed product settings (4 hours, 5 upcoming bookings), not editable in the app; "for now" in the issue suggests they may change later, so they should be easy to change in configuration. An admin settings screen would be a new story.
- A-2 The limits apply to every user, admins included: the overview calls the office admin "an employee with role ADMIN", and the issue names no exception.
- A-3 "Upcoming" follows the existing glossary term: start after the current time. A booking in progress does not count, nor do past or deleted bookings. A new booking that starts exactly now (allowed by BR-7) is checked against the bookings already held.
- A-4 The limits apply only when a booking is made. Existing bookings longer than 4 hours, or users already holding more than 5 upcoming bookings, are left as they are; such a user cannot book again until they are below 5.
- A-5 "At most 4 hours" is inclusive: exactly 4 hours is allowed (matches the mockup, where 09:00–14:00 is too long).
- A-6 The upcoming-bookings limit is answered with `409 Conflict` (the request is valid but conflicts with the user's current bookings) and a plain `detail`, not a field error; the duration limit is a `400` field error on `end_at` like the other time rules. The texts of AC-5 and AC-8 are new copy in the style of the existing messages.
- A-7 The booking form does not check the upcoming-bookings count before sending; the API answer is shown. Low impact: one extra request, and the user sees the same message.
- A-8 Two bookings posted at the same moment by the same user may both pass the count check; with about 6 users this is accepted unless the Engineer can prevent it cheaply.

## Questions and answers
None

## Changelog
| Version | Change |
|---|---|
| 1 | Initial spec |
