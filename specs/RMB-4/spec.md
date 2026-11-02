---
issue: RMB-4
title: "Admin: manage rooms"
type: story
status: draft
version: 1
design: [specs/RMB-4/wireframes/manage-rooms.html, specs/RMB-4/wireframes/room-form.html, project-context/design/screens/room-list.html]
business_rules: [BR-1, BR-5, BR-6, BR-8, BR-9, BR-10, BR-11]
---

# RMB-4 Admin: manage rooms

## Summary
Office admins get a "Manage rooms" screen where they add rooms, change a room's name, capacity and equipment, take a room out of service and put it back into service. Taking a room out of service cancels its upcoming bookings, so the room list and availability stay accurate.

## Background
Rooms exist only as seed data (6 rooms, data-model.md); the business overview lists "Any administration screen" as not in the product. The `rooms.active` flag already exists and BR-1 hides inactive rooms from the room list and availability; RMB-1 (booking) already rejects bookings of an inactive room with `404` (RMB-1 AC-20). This story adds the admin flow that sets that flag and maintains rooms. The open points were answered in Jira (see "Questions and answers").

## Scope
- In scope:
  - A "Manage rooms" link in the header, shown only when the acting user is an admin.
  - The "Manage rooms" screen: all rooms (in service and out of service) with "Add room", "Edit", "Take out of service" and "Put back in service".
  - The room form for adding and editing a room: name, capacity, equipment, with validation (BR-9).
  - Taking a room out of service with a confirmation that shows how many upcoming bookings will be cancelled, and cancelling (deleting) those bookings (BR-11).
  - Putting a room back into service.
  - Admin-only API endpoints for the above (BR-10).
- Out of scope:
  - Deleting a room.
  - Scheduled out-of-service periods (from/to dates); out of service starts immediately and lasts until reactivated.
  - Notifying the owners of cancelled bookings (the product has no notifications).
  - Restoring cancelled bookings when a room is put back into service.
  - Any other admin feature (users, bookings of others) and real authentication.
  - The rest of the header navigation (Rooms · Find a room · My bookings) from the mockups.

## User stories
- As an office admin, I want to add rooms and change their name, capacity and equipment, so that the room list stays accurate.
- As an office admin, I want to take a room out of service and put it back later, so that nobody can book a room that cannot be used.

## Acceptance criteria
Example values assume the seed data (users: 1 "An Nguyen" `ADMIN`, 2 "Binh Tran" `EMPLOYEE`; rooms as in data-model.md, all in service) and a current time of Mon 2 Nov 2026 10:00 office time (`2026-11-02T03:00:00Z`). "Upcoming booking" means a booking whose start is after the current time (BR-11).

Access
- **AC-1** Given the acting user is An Nguyen (admin), when any page is shown, then the header shows a "Manage rooms" link that opens the Manage rooms screen; given the acting user is Binh Tran (employee), the link is not shown.
- **AC-2** Given the acting user is Binh Tran, when the Manage rooms screen or the room form is opened directly by URL, then only the alert "Only admins can manage rooms." is shown (no rooms, no buttons). The same happens when the acting user is switched from An Nguyen to Binh Tran while the screen is open.
- **AC-3** Given header `X-User-Id: 2` (employee), when any admin room endpoint (AC-24–AC-28) is called, then the response is `403` ProblemDetail with detail "Only admins can manage rooms." and nothing changes; with the header missing or `99`, the response is `401` ProblemDetail "Unknown user".

Manage rooms screen
- **AC-4** Given the acting user is An Nguyen and room Sa Pa is out of service, when the Manage rooms screen has loaded, then it shows the heading "Manage rooms", an "Add room" button and all 6 rooms ordered by name A–Z (Da Lat, Ha Long, Hoi An, Hue, Phu Quoc, Sa Pa). Each row shows the name, "Up to <capacity> people", the equipment chips ("TV", "Whiteboard", "Video conference", in that order), a status chip "In service" or "Out of service", an "Edit" button and either "Take out of service" (in service) or "Put back in service" (out of service).
- **AC-5** Given the room data is loading, then the screen shows "Loading rooms…"; given loading fails, it shows the error alert with the ProblemDetail `detail`, or "Could not load rooms. Try again later." when there is none.

Add a room
- **AC-6** Given the Manage rooms screen, when the admin clicks "Add room", then the room form opens with heading "Add room", Name and Capacity empty, the three equipment checkboxes unchecked, and buttons "Save room" and "Cancel".
- **AC-7** Given the Add room form with Name "  Nha Trang  ", Capacity 10 and equipment TV and Whiteboard checked, when the admin clicks "Save room", then a room is stored with name "Nha Trang", capacity 10, equipment TV and WHITEBOARD, in service; the Manage rooms screen shows the success message "Added Nha Trang." and lists Nha Trang between Hue and Phu Quoc. The room also appears on the room list (start page) and in the booking form's Room select as "Nha Trang · up to 10 people".
- **AC-8** Given the Add room form or the Edit room form, when the admin clicks "Cancel", then the Manage rooms screen is shown and nothing is stored or changed.

Edit a room
- **AC-9** Given the Manage rooms screen, when the admin clicks "Edit" on Hue, then the room form opens with heading "Edit room", Name "Hue", Capacity 6, TV and Whiteboard checked, Video conference unchecked.
- **AC-10** Given the Edit room form for Hue, when the admin changes Name to "Hue Garden", Capacity to 8, unchecks TV, checks Video conference and clicks "Save room", then the room keeps its id with name "Hue Garden", capacity 8, equipment WHITEBOARD and VIDEO_CONFERENCE; the Manage rooms screen shows "Saved Hue Garden."; the room's existing bookings stay with the room and are shown under the new name.
- **AC-11** Given Sa Pa is out of service, when the admin edits it and saves Capacity 3, then the capacity is stored and Sa Pa stays out of service.

Room form — validation (shown under the field, inputs kept, nothing stored)
- **AC-12** Given Name is empty or only spaces, when the admin clicks "Save room", then Name shows "Enter a name." and no request is sent. The Name field accepts at most 50 characters.
- **AC-13** Given Capacity is empty, 0, 101, -1 or 2.5, when the admin clicks "Save room", then Capacity shows "Enter a whole number from 1 to 100." and no request is sent; Capacity 1 and Capacity 100 are saved.
- **AC-14** Given the Add room form with Name "ha long" (another room is named "Ha Long"), or the Edit room form of Hue with Name " HA LONG ", when the admin clicks "Save room", then Name shows "A room with this name already exists." and nothing is stored. Given the Edit room form of Ha Long with Name "HA LONG" (only its own name in other letter case), then it is saved as "HA LONG".
- **AC-15** Given no equipment is checked, when the room is saved, then it is stored with no equipment (like Sa Pa).
- **AC-16** Given the API fails for another reason (e.g. a 500), when the admin clicks "Save room", then an error alert above the form shows the ProblemDetail `detail`, or "Could not save the room. Try again later." when there is none; the inputs are kept. While the request is in progress, "Save room" is disabled.

Take a room out of service
- **AC-17** Given Ha Long has these bookings: Mon 2 Nov 08:00–09:00 (past), 09:30–10:30 (in progress), 14:00–15:30, and Tue 3 Nov 09:00–10:00, when the admin clicks "Take out of service" on Ha Long, then a confirmation is shown in Ha Long's row: "Take Ha Long out of service? 2 upcoming bookings will be cancelled. Past and ongoing bookings are kept." with the buttons "Take out of service" (danger) and "Keep in service". With 1 upcoming booking the text says "1 upcoming booking will be cancelled."; with none it says "Take Sa Pa out of service? It has no upcoming bookings."
- **AC-18** Given the confirmation of AC-17, when the admin clicks "Take out of service", then Ha Long is stored as out of service, the bookings of 2 Nov 14:00–15:30 and 3 Nov 09:00–10:00 are deleted, the bookings of 08:00–09:00 and 09:30–10:30 are kept, and the Manage rooms screen shows the success message "Ha Long is out of service. 2 bookings cancelled." with Ha Long's status "Out of service" and the button "Put back in service". With one cancelled booking the message ends "1 booking cancelled."; with none, "No bookings cancelled."
- **AC-19** Given Hue has a booking starting exactly at the current time (10:00–11:00) and one starting at 10:15, when Hue is taken out of service, then the 10:00 booking is kept and the 10:15 booking is cancelled.
- **AC-20** Given the confirmation of AC-17, when the admin clicks "Keep in service", then the confirmation closes and nothing changes.
- **AC-21** Given Ha Long is out of service, then it is not on the room list (start page), not in `GET /api/rooms`, not in `GET /api/rooms/availability?date=2026-11-02` and not in the booking form's Room select (BR-1), and `POST /api/bookings` with `room_id` 1 answers `404` "Room 1 not found." (RMB-1 AC-20).

Put a room back into service
- **AC-22** Given Ha Long is out of service, when the admin clicks "Put back in service", then (without a confirmation) Ha Long is stored as in service, the Manage rooms screen shows "Ha Long is back in service." and the row shows "In service" and "Take out of service". Ha Long appears again on the room list and can be booked; the bookings cancelled in AC-18 are not restored, and the kept bookings show again in its availability.
- **AC-23** Given a take-out-of-service or put-back-in-service request fails, then an error alert above the list shows the ProblemDetail `detail`, or "Could not change the room. Try again later." when there is none, and the room's status is unchanged on screen. While the request is in progress, the clicked button is disabled.

API (all with `X-User-Id: 1`; errors as RFC 7807 ProblemDetail)
- **AC-24** `GET /api/admin/rooms` answers `200` with all rooms, in service and out of service, ordered by name, each with `id`, `name`, `capacity`, `equipment` (ordered TV, WHITEBOARD, VIDEO_CONFERENCE), `active` and `upcoming_bookings` (the number of bookings of the room that start after the current time of the injected clock), e.g. Ha Long in AC-17: `{"id":1,"name":"Ha Long","capacity":12,"equipment":["TV","WHITEBOARD","VIDEO_CONFERENCE"],"active":true,"upcoming_bookings":2}`.
- **AC-25** `POST /api/admin/rooms` with body `{"name":"  Nha Trang  ","capacity":10,"equipment":["TV","WHITEBOARD"]}` answers `201` with the created room (`name` "Nha Trang", `active` true, `upcoming_bookings` 0).
- **AC-26** `PUT /api/admin/rooms/3` with body `{"name":"Hue Garden","capacity":8,"equipment":["WHITEBOARD","VIDEO_CONFERENCE"]}` answers `200` with the updated room; `active` is not changed by this endpoint. For room id 99 the response is `404` "Room 99 not found."
- **AC-27** Given an otherwise valid body for AC-25 or AC-26, when it is sent with one of the following, then the response is `400` ProblemDetail with an `errors` entry for the named field and nothing is stored:
  - `name` missing, "" or "   " → field `name`, message "must not be blank"; `name` of 51 characters after trimming → field `name`, message "must be at most 50 characters";
  - `capacity` missing → field `capacity`, message "must not be null"; `capacity` 0 or 101 → field `capacity`, message "must be between 1 and 100";
  - `equipment` missing → field `equipment`, message "must not be null" (an empty list `[]` is valid); an unknown value such as `"PROJECTOR"` → `400`.
  A `name` equal to another room's name ignoring letter case and surrounding spaces (e.g. "ha long ") answers `409` ProblemDetail with detail `A room named "Ha Long" already exists.` (the existing room's name).
- **AC-28** `POST /api/admin/rooms/1/deactivate` answers `200` with the room (`active` false, `upcoming_bookings` 0) and `cancelled_bookings` 2 in the situation of AC-17, and has the effect of AC-18. `POST /api/admin/rooms/1/activate` answers `200` with the room (`active` true). Deactivating a room that is already out of service answers `409` "Room 1 is already out of service."; activating a room in service answers `409` "Room 1 is already in service."; room id 99 answers `404` "Room 99 not found." In each error case nothing changes.

## Business rules
- Existing: BR-1 (only active rooms in the room list and availability, ordered by name; the Manage rooms screen is the one place that lists out-of-service rooms), BR-5 (display), BR-6 (roles), BR-8 (bookings only for an active room).
- New **BR-9** A room has a name of 1–50 characters, unique ignoring letter case; leading and trailing spaces are removed before the name is checked and stored. Its capacity is a whole number from 1 to 100. Its equipment is any subset of TV, Whiteboard, Video conference (possibly none).
- New **BR-10** Only admins can add rooms, change them, take them out of service and put them back into service.
- New **BR-11** Taking a room out of service takes effect immediately and lasts until an admin puts it back into service. It cancels (deletes) every booking of the room that starts after that moment; bookings that started at or before it are kept. Putting the room back into service does not restore cancelled bookings.

## UI
### Header (all screens)
- A "Manage rooms" link, shown only when the acting user has role `ADMIN` (AC-1), as in the wireframe `specs/RMB-4/wireframes/manage-rooms.html`. The rest of the header keeps its current content.

### Manage rooms — wireframe `specs/RMB-4/wireframes/manage-rooms.html`
- Heading "Manage rooms", subtitle "All rooms, including rooms out of service.", button "Add room" (primary).
- Rows (cards) as in AC-4; equipment chips and "Up to <n> people" as on the room list (`project-context/design/screens/room-list.html`). Status chip "In service" / "Out of service"; a row of a room out of service is shown in muted style.
- States: default; loading ("Loading rooms…"); error (alert, AC-5); success message above the list (`.alert-success`, AC-7, AC-10, AC-18, AC-22; disappears when the admin leaves the screen); confirmation inside the row (AC-17); action error (AC-23); no access for employees (AC-2).
- An empty state is not needed: the seed always has rooms and rooms cannot be deleted.

### Room form — wireframe `specs/RMB-4/wireframes/room-form.html`
- Headings "Add room" / "Edit room". Fields: Name (text, max 50 characters), Capacity (number, 1–100, hint "People, from 1 to 100."), Equipment (checkboxes "TV", "Whiteboard", "Video conference"). Buttons "Save room" (primary) and "Cancel".
- States: default (add), edit (prefilled), validation errors under the field (AC-12–AC-14), server error alert above the form (AC-16), and no access (AC-2).
- After saving, the admin returns to the Manage rooms screen with the success message.

## Data and API impact
- Data: no new tables expected. `rooms.name` must be unique ignoring letter case (BR-9) and `rooms.capacity` limited to 1–100 for new and changed rooms; the seed rooms already comply. Deactivation deletes rows from `bookings`. Update data-model.md.
- API: new admin endpoints `GET /api/admin/rooms`, `POST /api/admin/rooms`, `PUT /api/admin/rooms/{id}`, `POST /api/admin/rooms/{id}/deactivate`, `POST /api/admin/rooms/{id}/activate` (behaviour in AC-24–AC-28; admin check from `X-User-Id`, AC-3). `GET /api/rooms`, `GET /api/rooms/availability` and `POST /api/bookings` are unchanged and already respect `active`. Update api.md.
- "Now" for upcoming bookings comes from the injected clock.

## Assumptions
- A-1 Only users with role `ADMIN` can use the screen and the endpoints (BR-10); employees get `403` "Only admins can manage rooms." and do not see the link. The issue is written for the office admin; this is the only meaning of the role today.
- A-2 A booking that starts exactly at the moment of deactivation counts as started and is kept; only bookings with a start strictly after now are cancelled (AC-19). Edge case of one instant.
- A-3 The upcoming-bookings count shown in the confirmation is taken when the confirmation opens; the success message reports the number actually cancelled at confirmation time.
- A-4 Putting a room back into service needs no confirmation, as it deletes nothing and is easily reversed.
- A-5 An out-of-service room can still be edited; editing never changes its status.
- A-6 Equipment may be empty (Sa Pa has none today). New rooms start in service.
- A-7 Changing a room's capacity does not touch its bookings (bookings have no attendee count).
- A-8 The admin endpoints live under `/api/admin/rooms`, deactivation/activation are separate actions, and calling them on a room already in that state answers `409`; the exact paths may be refined in the plan if api.md is updated to match.
- A-9 All labels and messages in this spec (screen texts, confirmation, success and error messages, `403`/`409` details) are new copy in the style of the existing mockups.
- A-10 The Manage rooms screen and the room form have no mockup; the two wireframes in `specs/RMB-4/wireframes/` define them.

## Questions and answers
| # | Question | Answer | Source |
|---|---|---|---|
| Q1 | What happens to a room's future bookings when an admin takes it out of service: cancelled automatically, action blocked, or kept? | Cancel (delete) every booking of the room that starts after now; before confirming, the admin sees how many bookings will be cancelled; no notification. | Suggested default accepted by admin, 2026-11-03 |
| Q2 | Does "out of service" start immediately and last until the admin puts the room back into service, with no scheduled dates? | Yes: starts immediately, lasts until reactivated, "Put back in service" action, no scheduled periods. | Suggested default accepted by admin, 2026-11-03 |
| Q3 | May an admin rename an existing room? | Yes: the name is editable, must stay unique (case-insensitive) and is 1–50 characters. | Suggested default accepted by admin, 2026-11-03 |
| Q4 | What is the allowed capacity range for a room? | A whole number from 1 to 100. | Suggested default accepted by admin, 2026-11-03 |

## Changelog
| Version | Change |
|---|---|
| 1 | Initial spec |
