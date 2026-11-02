---
issue: RMB-5
title: Find a free room
type: story
status: draft
version: 1
design: [project-context/design/screens/find-room.html, project-context/design/screens/booking-form.html]
business_rules: [BR-1, BR-2, BR-3, BR-4, BR-5, BR-7, BR-9, BR-12, BR-13]
---

# RMB-5 Find a free room

## Summary
Employees get a "Find a free room" screen: they enter a date, a time range, the number of attendees and optionally equipment, and see the active rooms that are free for the whole range, have enough capacity and all selected equipment, smallest fitting room first. A "Book" button on each result opens the booking form with room, date and times filled in.

## Background
Today an employee has to scan every room's timeline on the room list and compare capacities by hand. RMB-1 (Done) added booking through the booking form and explicitly left "opening the form from a search result with date and times preselected" to this story (RMB-1 spec, Out of scope). The mockup `project-context/design/screens/find-room.html` defines the screen, the matching rule ("free for the whole time range, with enough capacity and all selected equipment") and the order ("smallest fitting room first"). Related: RMB-2 (prevent double booking, in Spec Review), RMB-4 (manage rooms; out-of-service rooms, BR-11), RMB-6 (booking limits), RMB-8 (office hours).

## Scope
- In scope:
  - Header links "Rooms" (room list) and "Find a room" (this screen), as in the mockup navigation.
  - The "Find a free room" screen: search form (Date, From, To, Attendees, Equipment), client-side validation, results list with result count, empty, loading and error states.
  - The "Book <HH:mm>–<HH:mm>" button on each result, opening the existing booking form with room, date, start and end preselected.
  - A read-only API endpoint that returns the matching free rooms.
- Out of scope:
  - The "My bookings" header link and screen (RMB-3).
  - Office hours, public holidays and maximum booking length as search limits (RMB-8, RMB-6).
  - Suggesting alternative times or partially free rooms.
  - Searching across more than one office day (a range that crosses midnight).
  - Keeping the search inputs or results when the user leaves the screen and comes back.
  - Changing the business overview text (see A-10).

## User stories
- As an employee, I want to find rooms that are free for a given time and fit my number of attendees, optionally with specific equipment, so that I can book the right room quickly.

## Acceptance criteria
Example values assume the seed rooms (data-model.md: Ha Long 12 TV/Whiteboard/Video conference, Hoi An 8 TV/Video conference, Hue 6 TV/Whiteboard, Da Lat 4 Whiteboard, Sa Pa 2 none, Phu Quoc 20 TV/Whiteboard/Video conference; all in service), the acting user Binh Tran, a current time of Mon 2 Nov 2026 08:07 office time (`2026-11-02T01:07:00Z`) and these bookings (office time):
Ha Long 2 Nov 09:00–10:00 and 14:00–15:30; Hue 2 Nov 13:00–14:00 and 15:00–16:00; Da Lat 2 Nov 14:30–14:45; Sa Pa 2 Nov 23:00 – 3 Nov 01:00.

Navigation and initial state
- **AC-1** Given any page of the app, then the header shows the links "Rooms" (opens the room list) and "Find a room" (opens the Find a free room screen); the link of the current screen is highlighted (`aria-current="page"`).
- **AC-2** Given the user opens "Find a room", then the screen shows the heading "Find a free room", the subtitle "Rooms free for the whole time range, with enough capacity and all selected equipment · office time (Asia/Ho_Chi_Minh)", Date 2026-11-02 (today in office time), From, To and Attendees empty, the checkboxes "TV", "Whiteboard", "Video conference" unchecked, the button "Find rooms", and no result count or results.

Search results
- **AC-3** Given Date 2026-11-02, From 14:00, To 15:00, Attendees 6 and TV checked, when the user clicks "Find rooms", then the text "3 rooms are free on Mon 2 Nov 2026, 14:00–15:00 for 6 people with TV" is shown and the results list, in this order, Hue ("Up to 6 people", chips TV, Whiteboard), Hoi An ("Up to 8 people", chips TV, Video conference), Phu Quoc ("Up to 20 people", chips TV, Whiteboard, Video conference). Ha Long is not listed (booked 14:00–15:30).
- **AC-4** Given Date 2026-11-02, From 14:00, To 15:00, Attendees 1 and no equipment, when the user searches, then the results are Sa Pa, Hue, Hoi An, Phu Quoc (capacity ascending) and the count reads "4 rooms are free on Mon 2 Nov 2026, 14:00–15:00 for 1 person" (no "with …" part). Hue is listed although its bookings end at 14:00 and start at 15:00 (touching bookings do not block, BR-12); Da Lat is not listed (booked 14:30–14:45 inside the range).
- **AC-5** Given Date 2026-11-02, From 10:00, To 11:00, Attendees 6 and TV, Whiteboard and Video conference checked, when the user searches, then the results are Ha Long, Phu Quoc and the count reads "2 rooms are free on Mon 2 Nov 2026, 10:00–11:00 for 6 people with TV, Whiteboard and Video conference". With TV and Whiteboard checked it reads "… with TV and Whiteboard".
- **AC-6** Given Date 2026-11-02, From 14:00, To 15:00, Attendees 15 and no equipment, when the user searches, then the only result is Phu Quoc and the count reads "1 room is free on Mon 2 Nov 2026, 14:00–15:00 for 15 people".
- **AC-7** Given a room "Can Tho" with capacity 8 is added (RMB-4) and has no bookings, when the user searches 2026-11-02 14:00–15:00 for 7 people with no equipment, then the results are Can Tho, Hoi An, Phu Quoc (Can Tho before Hoi An: same capacity, name A–Z, BR-13).
- **AC-8** Given Phu Quoc is out of service (BR-11), when the user searches 2026-11-02 14:00–15:00 for 15 people, then no room is listed (BR-1) and the empty state of AC-10 is shown.
- **AC-9** Given Date 2026-11-03, From 00:30, To 01:30, Attendees 1 and no equipment, when the user searches, then Sa Pa is not listed (its booking 2 Nov 23:00 – 3 Nov 01:00 overlaps the range) and Hue is listed.
- **AC-10** Given a search with no matching room (e.g. Attendees 21), when the user searches, then no result count is shown and the card "No room is free for this time with these needs. Try another time, fewer attendees or less equipment." is shown.
- **AC-11** Given results are shown, when the user changes an input, then the previous results and count stay until "Find rooms" is clicked again; a new search replaces them.

Book from a result
- **AC-12** Given the results of AC-3, then each result has the button "Book 14:00–15:00"; when the user clicks it on Hoi An, then the booking form opens with room "Hoi An · up to 8 people", date 2026-11-02, Start 14:00, End 15:00 and Title empty, and the side panel shows Hoi An's availability for Mon 2 Nov 2026. Entering title "Design review" and clicking "Book room" stores the booking and shows the room-list success message "Booked Hoi An, Mon 2 Nov 2026, 14:00–15:00." (RMB-1 AC-6).

Validation (client side, shown under the field, inputs kept, no request sent, previous results hidden)
- **AC-13** Given From 15:00 and To 14:00 (or To 15:00), when the user clicks "Find rooms", then To shows "End time must be after the start time."
- **AC-14** Given From 14:10 (or To 15:05), when the user clicks "Find rooms", then that field shows "Use 15-minute steps, for example 09:00, 09:15, 09:30 or 09:45."
- **AC-15** Given the current time 08:07 on 2026-11-02 and Date 2026-11-02, From 08:00, To 09:00, when the user clicks "Find rooms", then From shows "Start is in the past. Choose a later time."; with From 08:15 the search runs. A search for 2026-11-01 shows the same message under From.
- **AC-16** Given Date, From or To is empty, when the user clicks "Find rooms", then that field shows "Choose a date.", "Choose a start time." or "Choose an end time." respectively.
- **AC-17** Given Attendees is empty, 0, -1, 2.5 or 101, when the user clicks "Find rooms", then Attendees shows "Enter a whole number from 1 to 100."; Attendees 1 and 100 are accepted and the search runs (with the seed rooms, 100 attendees gives the empty state of AC-10).

Loading and errors
- **AC-18** Given "Find rooms" was clicked, while the request is in progress, then the text "Searching…" is shown in place of the results and the button is disabled.
- **AC-19** Given the API fails (e.g. a 500), when the user searches, then an error alert above the results shows the ProblemDetail `detail`, or "Could not search for rooms. Try again later." when there is none; the inputs are kept and no results are shown.

API — `GET /api/rooms/free`
- **AC-20** Given `GET /api/rooms/free?start_at=2026-11-02T07:00:00Z&end_at=2026-11-02T08:00:00Z&attendees=6&equipment=TV`, then the response is `200` with the matching rooms in the shape of `GET /api/rooms`, ordered by capacity then name: `[{"id":3,"name":"Hue",…},{"id":2,"name":"Hoi An",…},{"id":6,"name":"Phu Quoc",…}]`. Without `equipment` no equipment is required; `equipment` may be repeated (`equipment=TV&equipment=WHITEBOARD`) and all listed values are required. No match returns `200` with `[]`. The endpoint needs no `X-User-Id`.
- **AC-21** Given `start_at`, `end_at` or `attendees` is missing, then the response is `400` ProblemDetail "Required parameter '<name>' is not present."; given a value that cannot be parsed (e.g. `attendees=six`, `start_at=2026-11-02`, `equipment=PROJECTOR`), then `400` "Invalid value '<value>' for parameter '<name>'.".
- **AC-22** Given otherwise valid parameters, when one of the following is sent, then the response is `400` ProblemDetail "Request validation failed." with an `errors` entry for the named parameter:
  - `start_at` or `end_at` not on a 15-minute step (e.g. `2026-11-02T07:10:00Z`) → that parameter, "must be on a 15-minute step";
  - `end_at` equal to or before `start_at` → `end_at`, "must be after start_at";
  - `start_at` before the current time of the injected clock → `start_at`, "must not be in the past" (equal to now is accepted);
  - `attendees` 0 or 101 → `attendees`, "must be between 1 and 100".

## Business rules
- Existing: BR-1 (only active rooms), BR-2 (15-minute steps), BR-3 (end after start), BR-4 (office day), BR-5 (time and date display), BR-7 (no start in the past; applied to the searched range, A-3), BR-9 (capacity 1–100, equipment set).
- New **BR-12** A room is free for a time range when none of its bookings overlaps the range: a booking overlaps when it starts before the range ends and ends after the range starts. A booking that ends exactly when the range starts, or starts exactly when it ends, does not overlap.
- New **BR-13** A room fits a search when it is active, free for the whole searched range (BR-12), its capacity is at least the number of attendees, and it has every selected equipment (more is fine). Fitting rooms are listed by capacity, smallest first, then by name A–Z.

## UI
### Header (all screens)
- Links "Rooms" and "Find a room" as in the navigation of `project-context/design/screens/find-room.html` (AC-1). "My bookings" is not added (RMB-3). The admin-only "Manage rooms" link from RMB-4 stays.

### Find a free room — `project-context/design/screens/find-room.html`
- States used: "results", "no room matches", "invalid search".
- Fields: Date (date input), From and To (time inputs, 15-minute step), Attendees (number, min 1), Equipment (checkboxes "TV", "Whiteboard", "Video conference"); button "Find rooms" (primary).
- Result count (`.result-count`): "<n> rooms are free on <Day D Mon YYYY>, <HH:mm>–<HH:mm> for <a> people[ with <equipment list>]"; singular "1 room is free"; "1 person" for one attendee; equipment in the order TV, Whiteboard, Video conference joined with ", " and a final " and ".
- Result card: name (h2), "Up to <capacity> people", the room's full equipment chips, button "Book <HH:mm>–<HH:mm>" (primary) with the searched times.
- Validation errors use `.field.invalid` + `.field-error` under the field as in the "invalid search" state, with the texts of AC-13–AC-17.
- States without a mockup, using existing styles (no wireframe needed): initial (form only, AC-2); loading "Searching…" (`.muted`, as "Loading rooms…" on the room list); error (`.alert-danger` above the results, as the room list error state).
- Differences from the mockup: the results state shows Hoi An (8) before Hue (6), which contradicts its own label "smallest fitting room first"; this spec follows the label (Hue first, AC-3). The mockup's "My bookings" link is not added.

### Booking form — `project-context/design/screens/booking-form.html`
- Opened from a search result with room, date, Start and End preselected and Title empty (the mockup subtitle's "from a search result" case). Everything else is unchanged from RMB-1.

## Data and API impact
- Data: no schema change; uses `rooms`, `room_equipment` and `bookings`.
- API: new read-only endpoint `GET /api/rooms/free` with query parameters `start_at`, `end_at` (UTC instants), `attendees` (integer) and optional repeatable `equipment` (enum names); returns active fitting rooms (BR-13) in the `GET /api/rooms` shape; errors as in AC-21–AC-22. The exact path may be refined in the plan if api.md is updated to match. Existing endpoints are unchanged.
- The web app converts the chosen office date and From/To times to UTC instants before sending (BR-4). The booking form must accept preselected date, start and end in addition to the room (today it takes only the room).
- "Now" for the past check comes from the injected clock. Update api.md.

## Assumptions
- A-1 "Free" means no overlapping booking for the whole range, with touching bookings allowed (BR-12) — the same overlap test as the availability endpoint; the mockup subtitle says "free for the whole time range".
- A-2 Matching and order follow the mockup: capacity ≥ attendees, all selected equipment required, smallest capacity first, ties by name A–Z (BR-13). The mockup's sample order (Hoi An before Hue) is treated as an illustrative-data mistake.
- A-3 A search cannot start in the past (BR-7 applied to search), on the client and in the API, because every result offers a "Book" button that would fail for a past start. Easy to relax later.
- A-4 Attendees is a whole number from 1 to 100, matching the room capacity range of BR-9.
- A-5 The search covers one office date (From and To on the chosen date, latest To 23:45), as in the booking form (RMB-1 A-5); bookings that cross midnight still block (AC-9).
- A-6 No office-hours or maximum-length limit on the searched range until RMB-8 and RMB-6.
- A-7 The screen opens with today's date and the other inputs empty; results stay until the next search and are not kept when leaving the screen (AC-2, AC-11).
- A-8 The endpoint is read-only and, like `GET /api/rooms/availability`, needs no acting user.
- A-9 Validation texts reuse the booking form copy (RMB-1) where the case is the same; "End time must be after the start time." is the mockup's own text. The result-count variants, "Searching…" and the error fallback text are new copy in the mockup's style.
- A-10 `project-context/business/overview.md` is already out of date (it still says bookings cannot be made); refreshing it is left to a separate change.

## Questions and answers
None

## Changelog
| Version | Change |
|---|---|
| 1 | Initial spec |
