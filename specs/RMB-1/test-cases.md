---
issue: RMB-1
spec_version: 1
---

# Test cases — RMB-1

Derived from `specs/RMB-1/spec.md` (v1) and the mockups `booking-form.html` / `room-list.html`. E2E cases run against the real clock (today in office time) with the e2e seed (today's sample bookings); API cases use a fixed clock `2026-11-02T01:07:00Z` (Mon 2 Nov 2026 08:07 office time). TC-41 to TC-45 were added after reading `pr.diff` (regression and assumption checks).

Test files: `e2e/qa-booking.spec.ts` (QA), `e2e/booking.spec.ts` (Engineer), `backend/.../booking/BookingControllerQaTest.java` (QA), `backend/.../booking/BookingControllerTest.java` (Engineer), `frontend/src/pages/BookingFormPage.spec.ts` (Engineer).

| ID | AC | Title | Type | Steps | Expected | Automated test |
|---|---|---|---|---|---|---|
| TC-1 | AC-1 | Book button on every card; form opens with Ha Long preselected | automated | 1. Open `/` 2. Check each of the 6 cards 3. Click "Book" on Ha Long | 6 "Book" buttons; heading "Book a room"; Room = "Ha Long · up to 12 people"; Date = today (office); Start, End, Title empty | e2e/qa-booking.spec.ts › "TC-1 (AC-1)…" |
| TC-2 | AC-2 | Room select lists active rooms A–Z with capacity | automated | Open the form, read the Room options | "Da Lat · up to 4 people", "Ha Long · up to 12 people", "Hoi An · up to 8 people", "Hue · up to 6 people", "Phu Quoc · up to 20 people", "Sa Pa · up to 2 people", in that order | e2e/qa-booking.spec.ts › "TC-2 (AC-2)…" |
| TC-3 | AC-3 | Side panel for Ha Long today | automated | Open the form for Ha Long (today) | Heading "Ha Long · <Day D Mon YYYY of today>", text exactly "Already booked: 09:00–10:00, 14:00–15:30", 08–18 timeline with 2 busy blocks | e2e/qa-booking.spec.ts › "TC-3 (AC-3)…" |
| TC-4 | AC-4 | Side panel follows date and room | automated | 1. Form for Ha Long 2. Date = today+45 3. Select "Hue" 4. Date = today | "Ha Long · <day>", "No bookings on this day.", 0 busy blocks; "Hue · <day>"; then Hue's bookings of today (08:30–09:00, 16:00–17:00) | e2e/qa-booking.spec.ts › "TC-4 (AC-4)…" |
| TC-5 | AC-5 | Time hint below Start/End | automated | Open the form | "Times are office time (Asia/Ho_Chi_Minh), in 15-minute steps." visible, below the End input | e2e/qa-booking.spec.ts › "TC-5 (AC-5)…" |
| TC-6 | AC-6 | Successful booking sends UTC instants and shows the success message | automated | Form: Ha Long, date D = today+9, 11:00–12:00, unique title, "Book room" | POST body start/end = D 04:00Z/05:00Z; room list shown; `.alert-success` "Booked Ha Long, <D>, 11:00–12:00." above the list; availability for D lists the interval | e2e/qa-booking.spec.ts › "TC-6 (AC-6, AC-8)…" |
| TC-7 | AC-6 | API stores room 1, user 2, title and instants | automated | POST as Binh Tran, body of AC-18 | Stored booking: room Ha Long, user Binh Tran, "Sprint planning", 04:00Z–05:00Z | BookingControllerTest › ac18CreatesBookingForActingUserWithClockCreatedAt |
| TC-8 | AC-7 | Today's booking appears on room list timeline and in availability | automated | Book a room today at a future slot via the form; GET availability for today | Busy interval in availability; busy block on the card when inside 08–18 (also checked manually: Ha Long 11:00–12:00 today) | e2e/booking.spec.ts › "AC-7: a booking for today…"; BookingControllerTest › ac7CreatedBookingAppearsInAvailability |
| TC-9 | AC-8 | Booking on another day: side panel for that day, not on today's list | automated | After TC-6: room list today, then form for Ha Long with date D | Ha Long card still has only its 2 sample blocks; side panel "Already booked: 11:00–12:00" | e2e/qa-booking.spec.ts › "TC-6 (AC-6, AC-8)…" |
| TC-10 | AC-9 | Title is trimmed | automated | POST title "  Retro  " | 201, `title` "Retro", stored "Retro" | BookingControllerTest › ac9StoresTitleWithoutLeadingAndTrailingSpaces |
| TC-11 | AC-10 | Cancel returns to the list, nothing stored | automated | Fill the form, click "Cancel" | Room list shown; no success message; no POST sent | e2e/qa-booking.spec.ts › "TC-11 (AC-10)…" |
| TC-12 | AC-11 | Start not on a 15-minute step (09:10) | automated | Start 09:10, end 10:00, title, "Book room" | Start `.field.invalid` with "Use 15-minute steps, for example 09:00, 09:15, 09:30 or 09:45."; no POST; inputs kept | e2e/qa-booking.spec.ts › "TC-12 (AC-11)…" |
| TC-13 | AC-11 | End not on a 15-minute step (10:05) | automated | Start 09:00, end 10:05 | Same message under End only; no POST | e2e/qa-booking.spec.ts › "TC-13 (AC-11)…" |
| TC-14 | AC-12 | End equal to start | automated | Start 11:00, end 11:00 | End shows "End must be after start."; no POST | e2e/qa-booking.spec.ts › "TC-14 (AC-12)…" |
| TC-15 | AC-12 | End before start | automated | Start 11:00, end 10:45 | End shows "End must be after start."; no POST | e2e/qa-booking.spec.ts › "TC-15 (AC-12)…" |
| TC-16 | AC-13 | Start in the past today | automated | Date today, start 00:00, end 00:15 | Start shows "Start is in the past. Choose a later time."; no POST | e2e/qa-booking.spec.ts › "TC-16 (AC-13)…" |
| TC-17 | AC-13 | At 08:07, start 08:00 rejected, 08:15 booked | automated | Component test with fixed time 2026-11-02T01:07Z | 08:00 → past error, no request; 08:15 → request with 01:15Z | BookingFormPage.spec.ts › "AC-13: books with start 08:15 at 08:07…" |
| TC-18 | AC-14 | Required fields empty | automated | Clear the date, leave start/end/title empty, "Book room" | "Choose a date.", "Choose a start time.", "Choose an end time.", "Enter a title."; no POST | e2e/qa-booking.spec.ts › "TC-18 (AC-14)…" |
| TC-19 | AC-14 | Title of only spaces counts as empty | automated | Valid times, title "     " | "Enter a title."; no POST | e2e/qa-booking.spec.ts › "TC-19 (AC-14)…" |
| TC-20 | AC-15 | Title limited to 100 characters | automated | Type 109 characters key by key | Value = first 100 characters | e2e/qa-booking.spec.ts › "TC-20 (AC-15)…" |
| TC-21 | AC-16 | Server rejection with ProblemDetail detail | automated | Route POST → 401 `{"detail":"Unknown user"}` | Alert above the form "Unknown user"; inputs kept; no success message | e2e/qa-booking.spec.ts › "TC-21 (AC-16)…" |
| TC-22 | AC-16 | Server 500 without detail | automated | Route POST → 500, empty body | Alert "Could not book the room. Try again later."; inputs kept | e2e/qa-booking.spec.ts › "TC-22 (AC-16)…" |
| TC-23 | AC-17 | Button disabled while the request runs | automated | Hold the POST; double-click "Book room" | Button disabled; exactly 1 POST; one success message | e2e/qa-booking.spec.ts › "TC-23 (AC-17)…" |
| TC-24 | AC-18 | POST returns 201 with the created booking | automated | POST body of AC-18, X-User-Id = Binh, clock 01:07Z | 201; id, room_id, user_id, title, start_at, end_at, created_at "2026-11-02T01:07:00Z" | BookingControllerTest › ac18CreatesBookingForActingUserWithClockCreatedAt |
| TC-25 | AC-19 | Missing X-User-Id | automated | POST a valid body without the header | 401 ProblemDetail "Unknown user"; nothing stored | BookingControllerTest › ac19RejectsMissingUserHeaderWith401 |
| TC-26 | AC-19 | Unknown user 99 (also with an invalid body) | automated | X-User-Id 99 | 401 "Unknown user", no `errors`; nothing stored | BookingControllerTest › ac19RejectsUnknownUserWith401, ac19ChecksUserBeforeValidatingTheBody |
| TC-27 | — | Non-numeric X-User-Id | automated | X-User-Id "abc" | Client-error ProblemDetail, nothing stored (observed: 400 "Invalid value 'abc' for parameter 'X-User-Id'.") | BookingControllerQaTest › tc27NonNumericUserHeaderIsAClientErrorProblemDetailAndStoresNothing |
| TC-28 | AC-20 | Unknown room 99 | automated | room_id 99 | 404 "Room 99 not found."; nothing stored | BookingControllerTest › ac20RejectsUnknownRoomWith404 |
| TC-29 | AC-20 | Inactive room | automated | Deactivate Sa Pa, POST its id | 404 "Room <id> not found." | BookingControllerTest › ac20RejectsInactiveRoomWith404 |
| TC-30 | AC-21 | start_at off-step (04:10, 04:00:30) | automated | POST each | 400, start_at "must be on a 15-minute step" | BookingControllerTest › ac21RejectsInvalidTimes |
| TC-31 | AC-21 | end_at off-step (05:05, 05:00:30) | automated | POST each | 400, end_at "must be on a 15-minute step" | BookingControllerTest › ac21RejectsInvalidTimes |
| TC-32 | AC-21 | end_at equal to / before start_at | automated | end = start; end 03:45 | 400, end_at "must be after start_at" | BookingControllerTest › ac21RejectsInvalidTimes |
| TC-33 | AC-21 | start_at in the past | automated | clock 01:07Z, start 01:00Z | 400, start_at "must not be in the past" | BookingControllerTest › ac21RejectsInvalidTimes; BookingControllerQaTest › tc44… |
| TC-34 | AC-21 | Title missing / null / "" / "   " | automated | POST each | 400, title "must not be blank" | BookingControllerTest › ac21RejectsBlankTitle, ac21RejectsMissingTitleProperty |
| TC-35 | AC-21 | Title of 100 vs 101 characters after trimming | automated | 100 chars with surrounding spaces; 101 chars | 201; 400 title "must be at most 100 characters" | BookingControllerTest › ac21AcceptsTitleOf100CharactersSurroundedBySpaces, ac21RejectsTitleLongerThan100CharactersAfterTrimming |
| TC-36 | AC-21 | Missing room_id / start_at / end_at | automated | Omit each | 400, that field "must not be null" | BookingControllerTest › ac21RejectsMissingRequiredFields |
| TC-37 | AC-22 | start_at equal to now accepted, one step before rejected | automated | Clock 01:15Z; start 01:15Z; start 01:00Z | 201; 400 | BookingControllerTest › ac22AcceptsStartEqualToNow, ac22RejectsStartOneStepBeforeNow |
| TC-38 | — | Booking crossing office midnight accepted by the API (A-5) | automated | start 16:00Z, end 18:00Z (23:00–01:00 office) | 201 | BookingControllerQaTest › tc38AcceptsABookingThatCrossesOfficeMidnight |
| TC-39 | — | Success message disappears when the user leaves the room list | automated | Book; open the form again; Cancel | No success alert on return | e2e/qa-booking.spec.ts › "TC-39…" |
| TC-40 | — | Visual comparison with the mockups | manual | Compare form (default, step error) and room list (success) with the mockups | Layout, labels, states match | — (exploratory, screenshots in qa/) |
| TC-41 | — | An admin can book for themselves (A-4) | automated | X-User-Id = An Nguyen, Sa Pa | 201, user_id = An Nguyen | BookingControllerQaTest › tc41AnAdminCanBookForThemselves |
| TC-42 | — | Start at office midnight (17:00Z) is on a step | automated | start 2026-11-02T17:00Z, end 17:15Z | 201 | BookingControllerQaTest › tc42AcceptsAStartAtOfficeMidnightOfTheNextDay |
| TC-43 | — | Step errors on start and end reported together | automated | start 04:10Z, end 05:05Z | 400 with both start_at and end_at entries; nothing stored | BookingControllerQaTest › tc43ReportsStepErrorsForStartAndEndTogether |
| TC-44 | AC-21 | Past start vs next step after now (API side of AC-13) | automated | clock 01:07Z; start 01:00Z; then start 01:15Z | 400 "must not be in the past"; then 201 | BookingControllerQaTest › tc44RejectsAStartOneMinuteBeforeNowOnlyWhenOnAStepInThePast |
| TC-45 | — | Deep link to the form for an unknown room (router added by the PR) | manual | Open `/book/999` | Observed: form with an empty Room select and side panel heading "· <date>"; booking would be answered 404 by the API | — (exploratory, qa/TC-45-deep-link-unknown-room.png) |
