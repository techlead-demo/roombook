---
issue: RMB-1
title: Book a meeting room
type: story
status: draft
version: 1
design: [project-context/design/screens/booking-form.html, project-context/design/screens/room-list.html]
business_rules: [BR-1, BR-2, BR-3, BR-4, BR-5, BR-7, BR-8]
---

# RMB-1 Book a meeting room

## Summary
Employees can book an active meeting room for a date, a start and an end time (15-minute steps) and a title, from the "Book" button on the room list. The new booking is stored for the acting user and shows up as busy time in the room's availability for that day.

## Background
Today bookings exist only as sample data; the app and API cannot create one (business overview, "Not in the product today"). This story adds the first write flow. It blocks the follow-up stories that add rules on top of it: RMB-2 (prevent double booking), RMB-3 (list and cancel my bookings), RMB-5 (find a free room), RMB-6 (booking limits: at most 4 hours, at most 5 upcoming bookings), RMB-8 (office hours and public holidays), RMB-9 (check-in and no-shows), RMB-10 (utilisation report).

## Scope
- In scope:
  - The "Book" button on every room card of the room list.
  - The booking form (room, date, start, end, title) with the room's availability for the chosen date beside it.
  - Validation of the 15-minute steps (BR-2), end after start (BR-3), start not in the past (BR-7), required fields and title length (BR-8).
  - Creating the booking through the API for the acting user, and the success message on the room list.
- Out of scope:
  - Rejecting overlapping bookings and the "already booked" error state of the mockup (RMB-2).
  - The 4-hour maximum and the "booking too long" error state of the mockup; limits per employee (RMB-6).
  - Office hours and public holidays (RMB-8).
  - Opening the form from a search result with date and times preselected (RMB-5).
  - The header navigation (Rooms · Find a room · My bookings), listing, changing or cancelling bookings (RMB-3).
  - Bookings that span more than one office day through the form (see A-5).

## User stories
- As an employee, I want to book a meeting room for a time slot, so that my team has a place to meet.

## Acceptance criteria
Example values assume the seed data (room 1 "Ha Long", capacity 12; user 2 "Binh Tran") and a current time of Mon 2 Nov 2026 08:07 office time (`2026-11-02T01:07:00Z`), with existing bookings of Ha Long on that day from 09:00 to 10:00 and from 14:00 to 15:30.

Room list
- **AC-1** Given the room list is shown, when it has loaded, then every room card has a "Book" button; clicking "Book" on the Ha Long card opens the booking form with heading "Book a room", room "Ha Long · up to 12 people" selected, date 2026-11-02 (today in office time), Start and End empty and Title empty.

Booking form — display
- **AC-2** Given the booking form is open, when the user opens the Room select, then it lists every active room as "<name> · up to <capacity> people", ordered by name A–Z (BR-1), e.g. "Da Lat · up to 4 people" first and "Sa Pa · up to 2 people" last.
- **AC-3** Given the booking form for Ha Long on 2026-11-02, then the side panel shows the heading "Ha Long · Mon 2 Nov 2026", the text "Already booked: 09:00–10:00, 14:00–15:30" and the 08:00–18:00 timeline with those two busy blocks.
- **AC-4** Given the booking form for Ha Long, when the user changes the date to 2026-11-03 (a day without bookings of Ha Long), then the side panel shows "Ha Long · Tue 3 Nov 2026", the text "No bookings on this day." and an empty timeline; when the user then selects room "Hue", the heading changes to "Hue · Tue 3 Nov 2026" and shows Hue's bookings of that day.
- **AC-5** Given the booking form is open, then the hint "Times are office time (Asia/Ho_Chi_Minh), in 15-minute steps." is shown below Start and End.

Booking form — successful booking
- **AC-6** Given the acting user is Binh Tran and the form has room Ha Long, date 2026-11-02, start 11:00, end 12:00, title "Sprint planning", when the user clicks "Book room", then a booking is stored with room 1, user 2, title "Sprint planning", start `2026-11-02T04:00:00Z` and end `2026-11-02T05:00:00Z`, and the app shows the room list with the success message "Booked Ha Long, Mon 2 Nov 2026, 11:00–12:00." above the list.
- **AC-7** Given the booking of AC-6 was made, when the room list (today, 2 Nov 2026) is shown, then Ha Long's timeline shows a busy block from 11:00 to 12:00, and `GET /api/rooms/availability?date=2026-11-02` lists `{"start_at":"2026-11-02T04:00:00Z","end_at":"2026-11-02T05:00:00Z"}` in Ha Long's `busy` list.
- **AC-8** Given a booking is made for Ha Long on 2026-11-05 from 09:00 to 10:00, when the user opens the booking form for Ha Long and chooses date 2026-11-05, then the side panel shows "Already booked: 09:00–10:00"; the room list (today) does not show it.
- **AC-9** Given the title is entered as "  Retro  " (leading and trailing spaces), when the booking is made, then it is stored with title "Retro".
- **AC-10** Given the user clicks "Cancel" on the booking form, then the room list is shown and no booking is stored.

Booking form — validation (shown under the field, inputs kept, nothing stored)
- **AC-11** Given start 09:10 and end 10:00, when the user clicks "Book room", then Start shows "Use 15-minute steps, for example 09:00, 09:15, 09:30 or 09:45." and no request is sent. The same message is shown under End for an end of 10:05.
- **AC-12** Given start 11:00 and end 11:00 (or end 10:45), when the user clicks "Book room", then End shows "End must be after start."
- **AC-13** Given the current time is 08:07 on 2026-11-02 and the form has date 2026-11-02, start 08:00, end 09:00, when the user clicks "Book room", then Start shows "Start is in the past. Choose a later time."; with start 08:15 the booking is made.
- **AC-14** Given the date, start, end or title is empty (a title of only spaces counts as empty), when the user clicks "Book room", then the empty field shows, respectively, "Choose a date.", "Choose a start time.", "Choose an end time." or "Enter a title."
- **AC-15** Given the Title field, when the user types more than 100 characters, then the field accepts only the first 100 characters.

Booking form — server errors
- **AC-16** Given the API rejects the booking or fails (e.g. the acting user is unknown, or a 500), when the user clicks "Book room", then an error alert is shown above the form with the ProblemDetail `detail` (or "Could not book the room. Try again later." when there is none), the inputs are kept and no success message is shown.
- **AC-17** Given the "Book room" button was clicked, while the request is in progress, then the button is disabled, so one click creates at most one booking.

API — `POST /api/bookings`
- **AC-18** Given header `X-User-Id: 2` and body `{"room_id":1,"title":"Sprint planning","start_at":"2026-11-02T04:00:00Z","end_at":"2026-11-02T05:00:00Z"}`, when it is posted, then the response is `201` with the created booking: `id`, `room_id` 1, `user_id` 2, `title` "Sprint planning", `start_at` "2026-11-02T04:00:00Z", `end_at` "2026-11-02T05:00:00Z" and `created_at` equal to the current time of the injected clock.
- **AC-19** Given the `X-User-Id` header is missing or is `99` (no such user), when a booking is posted, then the response is `401` ProblemDetail with detail "Unknown user" and nothing is stored.
- **AC-20** Given `room_id` 99 (no such room) or the id of an inactive room, when a booking is posted, then the response is `404` ProblemDetail with detail "Room 99 not found." (with the posted id) and nothing is stored.
- **AC-21** Given an otherwise valid body, when it is posted with one of the following, then the response is `400` ProblemDetail with an `errors` entry for the named field and nothing is stored:
  - `start_at` "2026-11-02T04:10:00Z" or "2026-11-02T04:00:30Z" → field `start_at`, message "must be on a 15-minute step"; the same for `end_at` → field `end_at`;
  - `end_at` equal to or before `start_at` → field `end_at`, message "must be after start_at";
  - `start_at` before the current time of the injected clock → field `start_at`, message "must not be in the past";
  - `title` missing, "" or "   " → field `title`, message "must not be blank"; `title` of 101 characters after trimming → field `title`, message "must be at most 100 characters";
  - `room_id`, `start_at` or `end_at` missing → that field, message "must not be null".
- **AC-22** Given a booking posted with `start_at` equal to the current time of the injected clock (on a 15-minute step), when it is posted, then it is accepted (`201`).

## Business rules
- Existing: BR-1 (only active rooms, ordered by name), BR-2 (15-minute steps), BR-3 (end after start), BR-4 (office day), BR-5 (time and date display).
- New **BR-7** A booking cannot start in the past: its start must be at or after the current time when it is made.
- New **BR-8** A booking is made by the acting user for one active room and has a title of 1–100 characters; leading and trailing spaces are removed before the title is checked and stored.

## UI
### Room list — `project-context/design/screens/room-list.html`
- Adds the "Book" button to every room card (as in the mockup) and the success state "Booked <room>, <Day D Mon YYYY>, <HH:mm>–<HH:mm>." (`.alert-success`, above the list). The message disappears when the user leaves the room list.
- Difference from the mockup: the header navigation is not part of this story (out of scope); the header keeps its current content.

### Booking form — `project-context/design/screens/booking-form.html`
- States used: "default" and "time not on a 15-minute step". Other validation errors (AC-12–AC-14) use the same field-error style (`.field.invalid` + `.field-error`) under the field named in the AC. Server errors (AC-16) use the `.alert-danger` alert above the form as in the "overlaps an existing booking" state, with the texts of AC-16.
- Fields: Room (select of active rooms, "<name> · up to <capacity> people"), Date (date input), Start and End (time inputs with 15-minute step), Title (text, max 100 characters); buttons "Book room" (primary) and "Cancel" (back to the room list).
- Side panel: "<room> · <Day D Mon YYYY>", "Already booked: <HH:mm>–<HH:mm>, …" in start order, the 08:00–18:00 timeline; follows the selected room and date. A booking that crosses midnight is listed with its times on the chosen day's clock (e.g. "22:00–01:00").
- Side panel states without a mockup, using the existing `.muted` text style: no bookings → "No bookings on this day."; loading → "Loading availability…"; availability failed → "Could not load availability." The form stays usable in these states.
- Form loading state: while the room list for the select loads, the page shows "Loading rooms…" (as in the room list loading state); if it fails, the room list error alert "Could not load rooms. Try again later."
- Differences from the mockup: the "overlaps an existing booking" and "booking too long" states are not implemented in this story (RMB-2, RMB-6); the subtitle about search results does not apply until RMB-5.
- No wireframe is needed: every element maps to the two mockups above.

## Data and API impact
- Data: no schema change expected; the existing `bookings` table (room, user, title, start, end, created_at) holds the new bookings.
- API: new endpoint `POST /api/bookings` (body `room_id`, `title`, `start_at`, `end_at`; acting user from `X-User-Id`; `201` with the created booking; errors as in AC-19–AC-21). `GET /api/rooms/availability` is unchanged and returns the new bookings. Update `project-context/architecture/api.md`.
- The web app converts the chosen office date and times to UTC instants before sending (BR-4, office time zone).

## Assumptions
- A-1 Overlapping bookings are still accepted in this story; preventing them is RMB-2, which this story blocks. Low impact: only six users, and RMB-2 follows.
- A-2 No maximum duration and no office-hours check in this story (RMB-6, RMB-8); the mockup's "booking too long" state is left for RMB-6.
- A-3 A booking cannot start in the past (BR-7), with "now" from the injected clock and a start equal to now accepted. Booking past time has no business purpose; easy to relax later.
- A-4 Any user, employee or admin, can book any active room for themselves; booking on behalf of someone else is not possible. Matches the "Acting as" model and the `user_id` column.
- A-5 The form books within one chosen date (latest end 23:45); the API itself does not reject a booking that crosses midnight, as BR-4 already allows a booking to belong to several office days.
- A-6 The form opens with today's date and empty Start, End and Title; the field-required and "End must be after start." messages, the side-panel texts and the generic server-error text are new copy in the style of the mockup.
- A-7 An unknown or inactive room both answer `404` "Room <id> not found.", so inactive rooms stay hidden (BR-1).
- A-8 After a successful booking the user returns to the room list (today) with the success message, as in the room-list mockup, even when the booking is for another day.

## Questions and answers
None

## Changelog
| Version | Change |
|---|---|
| 1 | Initial spec |
