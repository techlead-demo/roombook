---
issue: RMB-2
title: Prevent double booking
type: story
status: draft
version: 1
design: [project-context/design/screens/booking-form.html]
business_rules: [BR-2, BR-3, BR-4, BR-5, BR-7, BR-8, BR-12]
---

# RMB-2 Prevent double booking

## Summary
A new booking is rejected when its time overlaps an existing booking of the same room, so a room can never be booked twice for the same time. The booking form shows the "already booked" error from the mockup and keeps the user's inputs.

## Background
RMB-1 (Done) added `POST /api/bookings` and the booking form but deliberately still accepts overlapping bookings (RMB-1 A-1; api.md "Overlapping bookings are still accepted (RMB-2)"). The booking-form mockup already has the state "error — overlaps an existing booking", which RMB-1 left unimplemented. RMB-2 blocks RMB-7 (recurring weekly bookings), which will reuse the overlap rule defined here. Rooms taken out of service have their upcoming bookings deleted (BR-11), so those can never cause a conflict.

## Scope
- In scope:
  - The overlap rule (BR-12) checked by `POST /api/bookings` for every new booking, including when two requests arrive at the same time.
  - The `409` ProblemDetail answer with the "already booked" message.
  - The "overlaps an existing booking" error state of the booking form, and refreshing the side panel's availability after that error.
- Out of scope:
  - Recurring bookings and their conflicts (RMB-7).
  - Preventing one user from booking two different rooms at the same time.
  - Checking overlaps in the form before the user clicks "Book room" (e.g. disabling busy times).
  - Suggesting another free time or room (RMB-5 "Find a free room").
  - Cleaning up overlapping bookings that already exist in the data (see A-6).
  - Changing an existing booking (not in the product).

## User stories
- As an employee, I want the system to stop two bookings of the same room from overlapping, so that nobody arrives at an occupied room.

## Acceptance criteria
Example values assume the seed data (room 1 "Ha Long", room 3 "Hue"; user 2 "Binh Tran", user 3 "Chi Le") and a current time of Mon 2 Nov 2026 08:07 office time (`2026-11-02T01:07:00Z`), with existing bookings of Ha Long on that day from 09:00 to 10:00 (`02:00Z–03:00Z`, made by Binh Tran) and from 14:00 to 15:30 (`07:00Z–08:30Z`), and no other bookings. Times are office time unless written as UTC. "Rejected" means: response `409` ProblemDetail with the stated `detail`, and nothing is stored.

API — `POST /api/bookings`
- **AC-1** Given `X-User-Id: 3` and a valid body for Ha Long from 09:00 to 10:00 (`start_at` "2026-11-02T02:00:00Z", `end_at` "2026-11-02T03:00:00Z"), when it is posted, then it is rejected with `detail` "Ha Long is already booked from 09:00 to 10:00 on Mon 2 Nov 2026. Choose another time or another room." and Ha Long still has exactly two bookings on 2 Nov.
- **AC-2** Given a valid body for Ha Long with each of these times, when it is posted, then it is rejected with the same `detail` as AC-1: 08:30–09:15 (overlaps the start), 09:45–10:30 (overlaps the end), 09:15–09:45 (inside the existing booking), 08:30–10:30 (contains the existing booking).
- **AC-3** Given a valid body for Ha Long with each of these times, when it is posted, then it is accepted (`201`): 08:15–09:00 (ends when the existing booking starts), 10:00–11:00 (starts when it ends), 10:00–14:00 (fills the whole gap between the two bookings).
- **AC-4** Given a valid body for Ha Long from 09:30 to 14:30 (overlaps both existing bookings), when it is posted, then it is rejected with the `detail` naming the earliest-starting conflicting booking: "Ha Long is already booked from 09:00 to 10:00 on Mon 2 Nov 2026. Choose another time or another room."
- **AC-5** Given a valid body for Hue from 09:00 to 10:00 posted by Binh Tran (who has Ha Long at that time), when it is posted, then it is accepted (`201`): only bookings of the same room conflict.
- **AC-6** Given `X-User-Id: 2` (Binh Tran, owner of the 09:00–10:00 booking) and a valid body for Ha Long from 09:30 to 10:30, when it is posted, then it is rejected as in AC-1: who made the existing booking does not matter.
- **AC-7** Given the current time is 09:30 (`2026-11-02T02:30:00Z`), so the 09:00–10:00 booking is in progress, and a valid body for Ha Long from 09:30 to 10:30, when it is posted, then it is rejected with the `detail` of AC-1.
- **AC-8** Given Ha Long also has a booking from Mon 2 Nov 22:00 to Tue 3 Nov 01:00 (`2026-11-02T15:00:00Z`–`2026-11-02T18:00:00Z`) and a valid body for Ha Long on Tue 3 Nov from 00:00 to 00:30, when it is posted, then it is rejected with `detail` "Ha Long is already booked from 22:00 on Mon 2 Nov 2026 to 01:00 on Tue 3 Nov 2026. Choose another time or another room."
- **AC-9** Given a body that overlaps the 09:00–10:00 booking of Ha Long but also breaks an earlier check, when it is posted, then the earlier check answers and not the overlap: unknown `X-User-Id` → `401` "Unknown user"; empty title → `400` field `title`; `start_at` "2026-11-02T02:10:00Z" → `400` field `start_at` "must be on a 15-minute step"; `end_at` before `start_at` → `400` field `end_at`. Given the current time is 09:30 and a body for 09:15–10:00, the answer is `400` field `start_at` "must not be in the past".
- **AC-10** Given Ha Long is free from 11:00 to 12:00, when two valid requests for Ha Long from 11:00 to 12:00 (by Binh Tran and by Chi Le) are processed at the same time, then exactly one answers `201` and the other answers `409` with `detail` "Ha Long is already booked from 11:00 to 12:00 on Mon 2 Nov 2026. Choose another time or another room.", and exactly one booking from 11:00 to 12:00 is stored.

Booking form (`project-context/design/screens/booking-form.html`, state "error — overlaps an existing booking")
- **AC-11** Given the booking form with room Ha Long, date 2026-11-02, start 09:00, end 10:00 and title "Sprint planning", when the user clicks "Book room", then the error alert "Ha Long is already booked from 09:00 to 10:00 on Mon 2 Nov 2026. Choose another time or another room." is shown above the form, the form stays open with all inputs kept, no success message is shown and no booking is stored.
- **AC-12** Given the alert of AC-11 is shown, when the user changes start to 10:00 and end to 11:00 and clicks "Book room", then the booking is made and the room list shows "Booked Ha Long, Mon 2 Nov 2026, 10:00–11:00."
- **AC-13** Given the booking form for Ha Long on 2026-11-02 shows "Already booked: 09:00–10:00, 14:00–15:30", and afterwards another user books Ha Long from 11:00 to 12:00, when the user submits 11:00–12:00, then the alert "Ha Long is already booked from 11:00 to 12:00 on Mon 2 Nov 2026. Choose another time or another room." is shown and the side panel reloads to "Already booked: 09:00–10:00, 11:00–12:00, 14:00–15:30" with the 11:00–12:00 busy block on the timeline.

Existing data
- **AC-14** Given two overlapping bookings of Ha Long already stored before this change (e.g. 11:00–12:00 and 11:30–12:30, inserted directly), when `GET /api/rooms/availability?date=2026-11-02` is requested, then both are still listed in Ha Long's `busy` list; and a new booking for Ha Long from 12:00 to 12:30 is rejected with `detail` "Ha Long is already booked from 11:30 to 12:30 on Mon 2 Nov 2026. Choose another time or another room."

## Business rules
- Existing: BR-2 (15-minute steps), BR-3 (end after start), BR-4 (office day; a booking may cross midnight), BR-5 (time and date display, used in the message), BR-7 (no start in the past), BR-8 (booking for one active room by the acting user).
- New **BR-12** Two bookings of the same room may not overlap. Bookings overlap when each starts before the other ends; a booking that ends exactly when another starts does not overlap it. A new booking that overlaps any existing booking of the room (past, ongoing or upcoming, made by anyone) is rejected.

## UI
### Booking form — `project-context/design/screens/booking-form.html`
- Implements the state "error — overlaps an existing booking": `.alert-danger` above the form with the API's `detail` (AC-11, AC-8 wording for a booking that crosses midnight), inputs kept, form stays open. This uses the existing server-error behaviour of RMB-1 AC-16; the text comes from the API.
- New behaviour: after a `409` answer the side panel reloads the availability of the selected room and date (AC-13), using the existing side-panel states (loading "Loading availability…", error "Could not load availability.").
- The alert stays until the next "Book room" click; it is not cleared while the user edits fields (as for other server errors in RMB-1).
- Differences from the mockup: the header navigation and the "booking too long" state remain out of scope (RMB-3, RMB-6). No wireframe is needed: every element maps to the mockup.

## Data and API impact
- Data: no new data. The overlap check must hold under concurrent requests (AC-10); how (locking, constraint, transaction isolation) is for the plan. Existing overlapping rows are not changed. Update the invariants in data-model.md.
- API: `POST /api/bookings` gains a `409 Conflict` ProblemDetail with the `detail` of AC-1/AC-8, checked after the user, body, room and time rules (AC-9). `GET /api/rooms/availability` is unchanged. Update api.md (remove "Overlapping bookings are still accepted (RMB-2)", add the `409` row and the check order).
- Message format: "<room name> is already booked from <HH:mm> to <HH:mm> on <Day D Mon YYYY>. Choose another time or another room." in office time (BR-5); when the conflicting booking starts and ends on different office days: "<room name> is already booked from <HH:mm> on <Day D Mon YYYY> to <HH:mm> on <Day D Mon YYYY>. Choose another time or another room." The conflicting booking named is the one with the earliest start.

## Assumptions
- A-1 Bookings are half-open intervals: back-to-back bookings (one ends at 10:00, the next starts at 10:00) are allowed (AC-3). This is the usual meaning and matches the 15-minute grid; the mockup only shows a full overlap.
- A-2 Every existing booking of the room counts, whoever made it, including the acting user's own and bookings already in progress (AC-6, AC-7). The issue says "two bookings of the same room" without exceptions.
- A-3 Only the same room is checked; one person may hold two rooms at the same time (AC-5). The issue is about rooms, not people; easy to add later.
- A-4 The API answers `409` with the mockup's message, naming the earliest-starting conflicting booking only, and not who booked it or its title (the availability view does not show owners either).
- A-5 The overlap check runs last, after the user, body, room and time checks (AC-9), so the existing `400`/`401`/`404` answers of RMB-1 stay unchanged.
- A-6 Overlapping bookings that already exist (sample data or bookings made before this change) are kept and shown; they only block new bookings (AC-14). With six users and a short time since RMB-1, a cleanup is not worth the risk of deleting someone's booking.
- A-7 The form does not pre-check overlaps before submit; it relies on the API answer and then refreshes the side panel (AC-13). The side panel already shows busy times, and the mockup shows the error as coming from the API.
- A-8 The message wording for a booking that crosses midnight (AC-8) is new copy in the style of the mockup.

## Questions and answers
None

## Changelog
| Version | Change |
|---|---|
| 1 | Initial spec |
