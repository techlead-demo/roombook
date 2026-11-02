---
issue: RMB-3
title: List and cancel my bookings
type: story
status: draft
version: 1
design: [project-context/design/screens/my-bookings.html, project-context/design/screens/room-list.html]
business_rules: [BR-1, BR-4, BR-5, BR-7, BR-8, BR-11, BR-12]
---

# RMB-3 List and cancel my bookings

## Summary
Employees get a "My bookings" screen that lists the acting user's upcoming and recent past bookings, and can cancel an upcoming booking so the room becomes free for others at once. Past and ongoing bookings cannot be cancelled.

## Background
RMB-1 (Done) lets the acting user make bookings (`POST /api/bookings`), but there is no way to see them together or to cancel one; the RMB-1 spec left "listing, changing or cancelling bookings" and the header navigation to this story. The mockup `project-context/design/screens/my-bookings.html` covers the screen. BR-11 (RMB-4) already defines cancelling as deleting a booking and uses "upcoming" as "starts after now" (glossary "Upcoming booking"); this story uses the same meaning.

## Scope
- In scope:
  - Header navigation links "Rooms" and "My bookings" (from the mockups).
  - The "My bookings" screen: Upcoming list (ongoing and upcoming bookings) and Past list (bookings that ended within the last 30 days) of the acting user.
  - Cancelling one of the acting user's upcoming bookings from the Upcoming list (BR-12), with the success message from the mockup.
  - API endpoints to list the acting user's bookings and to cancel one of them.
- Out of scope:
  - The "Find a room" navigation link and the find-room screen (RMB-5).
  - Changing a booking (room, time or title).
  - Cancelling an ongoing booking or ending it early, and cancelling bookings of other users (also for admins).
  - Notifications, an undo, or keeping a record of cancelled bookings.
  - Paging or filtering the lists; past bookings older than 30 days.
  - Updating the business overview's "Not in the product today" section (already stale since RMB-1); noted for a later context update.

## User stories
- As an employee, I want to see my upcoming bookings and cancel the ones I no longer need, so that rooms are freed for others.

## Acceptance criteria
Example values assume the seed data (rooms as in data-model.md; users 2 "Binh Tran", 3 "Chi Le") and a current time of Mon 2 Nov 2026 10:00 office time (`2026-11-02T03:00:00Z`). The bookings are:

| Id | User | Room | Office time | UTC | Title |
|---|---|---|---|---|---|
| 11 | Binh Tran | Ha Long | Mon 2 Nov 2026 14:00–15:30 | `2026-11-02T07:00:00Z`–`08:30:00Z` | Customer call |
| 12 | Binh Tran | Hue | Wed 4 Nov 2026 10:00–10:30 | `2026-11-04T03:00:00Z`–`03:30:00Z` | 1:1 with An |
| 13 | Binh Tran | Hoi An | Fri 6 Nov 2026 15:00–16:00 | `2026-11-06T08:00:00Z`–`09:00:00Z` | Sprint review |
| 14 | Binh Tran | Da Lat | Mon 2 Nov 2026 09:30–10:30 (ongoing) | `2026-11-02T02:30:00Z`–`03:30:00Z` | Stand-up |
| 15 | Binh Tran | Ha Long | Fri 30 Oct 2026 09:00–10:00 | `2026-10-30T02:00:00Z`–`03:00:00Z` | Weekly planning |
| 16 | Binh Tran | Sa Pa | Thu 29 Oct 2026 13:30–14:00 | `2026-10-29T06:30:00Z`–`07:00:00Z` | Call with supplier |
| 17 | Binh Tran | Hue | Thu 1 Oct 2026 09:00–10:00 (ended more than 30 days ago) | `2026-10-01T02:00:00Z`–`03:00:00Z` | Old retro |
| 18 | Chi Le | Hue | Mon 2 Nov 2026 11:00–12:00 | `2026-11-02T04:00:00Z`–`05:00:00Z` | Design review |

Navigation
- **AC-1** Given any screen, then the header shows the links "Rooms" (opens the room list) and "My bookings" (opens the My bookings screen) between the brand and the "Acting as" picker; the link of the current screen is highlighted (`aria-current="page"`). The "Manage rooms" link of RMB-4, when present, follows them.

My bookings — lists
- **AC-2** Given the acting user is Binh Tran, when the My bookings screen has loaded, then it shows the heading "My bookings", the subtitle `Bookings of the user chosen in "Acting as" · times in office time (Asia/Ho_Chi_Minh)` and a card "Upcoming" with the columns Date, Time, Room, Title and these rows in this order: "Mon 2 Nov 2026 · 09:30–10:30 · Da Lat · Stand-up" (no Cancel button), "Mon 2 Nov 2026 · 14:00–15:30 · Ha Long · Customer call", "Wed 4 Nov 2026 · 10:00–10:30 · Hue · 1:1 with An", "Fri 6 Nov 2026 · 15:00–16:00 · Hoi An · Sprint review"; each of the last three has a "Cancel" button.
- **AC-3** Given the situation of AC-2, then a card "Past" (muted style) lists, most recent first, "Fri 30 Oct 2026 · 09:00–10:00 · Ha Long · Weekly planning" and "Thu 29 Oct 2026 · 13:30–14:00 · Sa Pa · Call with supplier", with no buttons; booking 17 (ended 1 Oct) is not shown.
- **AC-4** Given a past booking that ended exactly 30 days before now (end `2026-10-03T03:00:00Z`), then it is shown in Past; one that ended at `2026-10-03T02:45:00Z` is not.
- **AC-5** Given a booking whose end is exactly now (09:00–10:00 on 2 Nov), then it is shown in Past; given a booking that starts exactly now (10:00–11:00), then it is shown in Upcoming without a "Cancel" button.
- **AC-6** Given the acting user is Binh Tran, then Chi Le's booking 18 is not shown; when the acting user is switched to Chi Le while the screen is open, the lists reload and show only "Mon 2 Nov 2026 · 11:00–12:00 · Hue · Design review" in Upcoming.
- **AC-7** Given a booking of Binh Tran from Mon 2 Nov 2026 22:00 to Tue 3 Nov 2026 01:00, then its row shows Date "Mon 2 Nov 2026" (the start's office day) and Time "22:00–01:00".
- **AC-8** Given Binh Tran's past booking 15 is in room Ha Long and Ha Long has since been taken out of service (RMB-4), then the row is still shown in Past with Room "Ha Long".

My bookings — empty, loading and error states
- **AC-9** Given the acting user has no ongoing or upcoming bookings, then the Upcoming card shows "You have no upcoming bookings. Find a free room", where "Find a free room" is a link to the room list.
- **AC-10** Given the acting user has no bookings that ended within the last 30 days, then the Past card shows "No past bookings in the last 30 days."
- **AC-11** Given the bookings are loading, then the screen shows "Loading bookings…" instead of the cards; given loading fails, it shows an error alert with the ProblemDetail `detail`, or "Could not load your bookings. Try again later." when there is none.

Cancel a booking
- **AC-12** Given the situation of AC-2, when Binh Tran clicks "Cancel" on "Mon 2 Nov 2026 · 14:00–15:30 · Ha Long · Customer call", then booking 11 is deleted, the row disappears from Upcoming, and the success message "Booking cancelled: Ha Long, Mon 2 Nov 2026, 14:00–15:30." is shown above the lists. No confirmation is asked.
- **AC-13** Given booking 11 was cancelled (AC-12), when the room list for today (2 Nov 2026) is shown, then Ha Long's timeline no longer shows the 14:00–15:30 busy block, `GET /api/rooms/availability?date=2026-11-02` no longer lists `{"start_at":"2026-11-02T07:00:00Z","end_at":"2026-11-02T08:30:00Z"}` for Ha Long, and a new booking of Ha Long for 14:00–15:30 can be made.
- **AC-14** Given the cancelled booking was the acting user's only upcoming one, when it is cancelled, then the Upcoming card shows the empty state of AC-9 below the success message.
- **AC-15** Given the success message of AC-12, when the user leaves the My bookings screen or cancels another booking, then the message is removed or replaced by the new one.
- **AC-16** Given the "Cancel" button was clicked, while the request is in progress, then that button is disabled, so one click sends at most one request.
- **AC-17** Given the cancel request fails (e.g. the booking has started meanwhile, it no longer exists, or a 500), then an error alert above the lists shows the ProblemDetail `detail`, or "Could not cancel the booking. Try again later." when there is none; no success message is shown, and the lists are reloaded so that they show the current state.

API — list (`GET /api/bookings/mine`, header `X-User-Id`)
- **AC-18** Given header `X-User-Id: 2` in the situation of AC-2, when `GET /api/bookings/mine` is called, then the response is `200` with `{"upcoming":[…],"past":[…]}`: `upcoming` holds bookings 14, 11, 12, 13 (in that order, end after now, by `start_at` ascending), `past` holds bookings 15, 16 (end at or before now and at or after now − 30 days, by `start_at` descending). Each item has `id`, `room_id`, `room_name`, `title`, `start_at`, `end_at` and `cancellable` (true when `start_at` is after now), e.g. `{"id":11,"room_id":1,"room_name":"Ha Long","title":"Customer call","start_at":"2026-11-02T07:00:00Z","end_at":"2026-11-02T08:30:00Z","cancellable":true}`; booking 14 has `"cancellable":false`, past items have `"cancellable":false`.
- **AC-19** Given the `X-User-Id` header is missing or `99`, when `GET /api/bookings/mine` is called, then the response is `401` ProblemDetail with detail "Unknown user".

API — cancel (`DELETE /api/bookings/{id}`, header `X-User-Id`)
- **AC-20** Given header `X-User-Id: 2`, when `DELETE /api/bookings/11` is called, then the response is `204` with no body and booking 11 no longer exists.
- **AC-21** Given header `X-User-Id: 2`, when `DELETE /api/bookings/14` (ongoing) or `DELETE /api/bookings/15` (past) is called, then the response is `409` ProblemDetail with detail "Booking 14 has already started and cannot be cancelled." (with the requested id) and nothing is deleted. A booking whose `start_at` equals now (10:00, injected clock) is also rejected with `409`; one starting at the next 15-minute step (10:15) is cancelled (`204`).
- **AC-22** Given header `X-User-Id: 2`, when `DELETE /api/bookings/18` (Chi Le's booking) is called, then the response is `403` ProblemDetail with detail "You can only cancel your own bookings." and nothing is deleted; the same holds for an admin (`X-User-Id: 1`).
- **AC-23** Given header `X-User-Id: 2`, when `DELETE /api/bookings/999` (no such booking, or one already cancelled) is called, then the response is `404` ProblemDetail with detail "Booking 999 not found."
- **AC-24** Given the `X-User-Id` header is missing or `99`, when `DELETE /api/bookings/11` is called, then the response is `401` ProblemDetail "Unknown user" and nothing is deleted. The checks run in this order: user (`401`), booking exists (`404`), owner (`403`), not started (`409`).

## Business rules
- Existing: BR-1 (inactive rooms are hidden from the room list; their past bookings still appear in My bookings), BR-4 (office day of a booking), BR-5 (time and date display), BR-7 (start not in the past, so a cancelled slot that has not started can be booked again), BR-8 (bookings belong to the acting user who made them), BR-11 (cancelling means deleting; "upcoming" means starting after now).
- New **BR-12** A user can cancel only their own bookings, and only while the booking is upcoming (its start is after the current time). Cancelling deletes the booking and frees its time at once. Ongoing and past bookings cannot be cancelled. Admins have no extra right to cancel other users' bookings (BR-11 remains the only way bookings of others are cancelled).

## UI
### Header (all screens) — `project-context/design/screens/my-bookings.html`
- Navigation links "Rooms" and "My bookings" as in the mockup's `.nav` (current link highlighted). Difference from the mockup: the "Find a room" link is not shown until RMB-5. The RMB-4 "Manage rooms" link (admins only) follows "My bookings".

### My bookings — `project-context/design/screens/my-bookings.html`
- Heading, subtitle, the "Upcoming" and "Past" cards and their tables (Date, Time, Room, Title, hidden "Actions" column) exactly as in the mockup's default state. Date "Mon 2 Nov 2026" and Time "14:00–15:30" in office time (BR-5).
- Upcoming: ongoing bookings and upcoming bookings by start ascending; "Cancel" button (`.btn .btn-danger`) only on upcoming rows; ongoing rows have an empty action cell like the Past rows. Past: bookings that ended within the last 30 days, most recent first, muted (`.past`), no buttons.
- States:
  - default (mockup state "default");
  - after cancelling: `.alert-success` above the cards "Booking cancelled: <room>, <Day D Mon YYYY>, <HH:mm>–<HH:mm>." (mockup state "after cancelling"); the row is removed;
  - no upcoming bookings: "You have no upcoming bookings. Find a free room" (mockup state "no upcoming bookings"). Difference from the mockup: the link goes to the room list until RMB-5 adds the find-room screen;
  - no past bookings: "No past bookings in the last 30 days." in the Past card, using the same `.empty` style as the Upcoming empty state (no separate mockup state needed);
  - loading: "Loading bookings…" in the style of the room list loading state (`project-context/design/screens/room-list.html`);
  - load error and cancel error: `.alert-danger` above the cards with the texts of AC-11 and AC-17 (as the room list error state).
- No wireframe is needed: every element maps to the two mockups above.

## Data and API impact
- Data: no schema change expected. Cancelling deletes the row from `bookings` (as BR-11 does). Listing reads the acting user's bookings with the room name, including bookings of rooms out of service.
- API: new `GET /api/bookings/mine` (AC-18, AC-19) and `DELETE /api/bookings/{id}` (AC-20–AC-24), both using `X-User-Id`. `GET /api/rooms/availability` and `POST /api/bookings` are unchanged and reflect cancellations. Update `project-context/architecture/api.md`. The exact paths may be refined in the plan if api.md is updated to match.
- "Now" and the 30-day window come from the injected clock.

## Assumptions
- A-1 Cancelling deletes the booking (as in BR-11); no history of cancelled bookings is kept. The product has no reporting yet; a soft delete can be added later.
- A-2 A booking can be cancelled only while its start is after now (BR-12, glossary "Upcoming booking"); a booking that starts exactly now counts as started. Ongoing bookings are shown at the top of Upcoming without a "Cancel" button, so a meeting in progress is not shown as past.
- A-3 Only the booking's owner can cancel it; admins cannot cancel other users' bookings in this story (they can still take a room out of service, BR-11). The issue is about "my bookings".
- A-4 No confirmation before cancelling, as in the mockup (the row is removed and a success message is shown). Easy to add later.
- A-5 The Past list shows only bookings that ended within the last 30 days, most recent first, without paging. Display limit only; with about 6 users the lists stay short.
- A-6 A booking crossing midnight is listed under its start's office day with its times as on the clock ("22:00–01:00"), as in RMB-1's side panel.
- A-7 The "Find a room" link and the find-room target of the empty-state link wait for RMB-5; until then the link "Find a free room" opens the room list.
- A-8 API status codes and details (`403` "You can only cancel your own bookings.", `404` "Booking <id> not found.", `409` "Booking <id> has already started and cannot be cancelled.", `204` on success) and the texts "Loading bookings…", "Could not load your bookings. Try again later.", "Could not cancel the booking. Try again later.", "No past bookings in the last 30 days." are new copy in the style of the existing API and mockups.

## Questions and answers
None

## Changelog
| Version | Change |
|---|---|
| 1 | Initial spec |
