---
issue: RMB-1
spec_version: 1
revision: 0
---

# Implementation plan — RMB-1

## Approach
Backend: a new `POST /api/bookings` in the existing `booking/` package (controller → service → repository). `BookingRequest` validates the presence of the fields and the title with Bean Validation; its compact constructor strips the title first, so `"  Retro  "` is checked and stored as `"Retro"` (BR-8). `BookingService` resolves the acting user from `X-User-Id` (`401 "Unknown user"`), the active room (`404 "Room <id> not found."`, also for inactive rooms, A-7), then checks the time rules in the office zone with the injected `Clock`: 15-minute steps (BR-2), end after start (BR-3), start not before now (BR-7, start = now accepted). Those rule failures are thrown as a new `common/FieldValidationException`, which renders the same `400` + `errors` shape as `@Valid` failures. `ApiExceptionHandler` now reports `@Valid` field names in snake_case (`start_at`, not `startAt`) so both sources match the JSON contract.

Frontend: `App.vue` switches between `RoomListPage` and the new `BookingFormPage` with a `view` ref. The room list gets a "Book" button per card and shows the success message (`.alert-success`, `role="status"`) only while it is shown. The form follows `booking-form.html`: room select, date (today in office time), start/end (`type="time" step="900"`), title (`maxlength=100`, also truncated in code), hint, "Book room"/"Cancel", plus a side panel with the room's bookings for the chosen date (`fetchAvailability` + `RoomTimeline`). Client validation (`utils/bookingForm.ts`) shows the field errors of AC-11–AC-14 and sends nothing; office date + time are converted to UTC with a new `toUtcInstant` in `utils/time.ts`. Server errors show the ProblemDetail `detail` (or the generic text) above the form; the button is disabled while the request runs.

## Changes
| Area | File(s) | Change |
|---|---|---|
| API | `backend/.../booking/BookingController.java`, `BookingService.java`, `BookingRequest.java`, `BookingResponse.java` | New `POST /api/bookings` |
| API | `backend/.../common/FieldValidationException.java` | Service-side field errors as `400` + `errors` |
| API | `backend/.../common/ApiExceptionHandler.java` | `errors[].field` in snake_case |
| Web | `frontend/src/pages/BookingFormPage.vue` | New booking form page |
| Web | `frontend/src/pages/RoomListPage.vue`, `frontend/src/App.vue` | "Book" button, success message, page switching |
| Web | `frontend/src/api/bookings.ts`, `api/types.ts` | `createBooking`, `BookingRequest`/`Booking` types |
| Web | `frontend/src/utils/time.ts`, `utils/bookingForm.ts` | `toUtcInstant`, `isQuarterHourTime`, form validation |
| Web | `frontend/src/styles/base.css` | Shared mockup classes (`.card`, `.muted`, `.btn`, `.alert-*`) |

## Data model changes
None (the existing `bookings` table is used). `data-model.md` invariants now name where BR-2/BR-7/BR-8 are checked.

## Acceptance criteria → tests
| AC | Test(s) |
|---|---|
| AC-1 | `frontend/src/pages/RoomListPage.spec.ts` › "AC-1: every room card has a "Book" button…"; `BookingFormPage.spec.ts` › "AC-1: opens with the room preselected…"; `e2e/booking.spec.ts` › "AC-1, AC-3, AC-5…" |
| AC-2 | `BookingFormPage.spec.ts` › "AC-2…"; `e2e/booking.spec.ts` › "AC-2, AC-4…" |
| AC-3 | `BookingFormPage.spec.ts` › "AC-3…"; `e2e/booking.spec.ts` › "AC-1, AC-3, AC-5…" |
| AC-4 | `BookingFormPage.spec.ts` › "AC-4…"; `e2e/booking.spec.ts` › "AC-2, AC-4…" |
| AC-5 | `BookingFormPage.spec.ts` › "AC-5…"; e2e "AC-1, AC-3, AC-5…" |
| AC-6 | `BookingFormPage.spec.ts` › "AC-6…"; `RoomListPage.spec.ts` › "AC-6…"; `time.spec.ts` › "AC-6…"; e2e "AC-6…" |
| AC-7 | `BookingControllerTest` › `ac7CreatedBookingAppearsInAvailability`; `RoomListPage.spec.ts` › "AC-7…"; e2e "AC-7…" |
| AC-8 | e2e "AC-8…" |
| AC-9 | `BookingControllerTest` › `ac9StoresTitleWithoutLeadingAndTrailingSpaces`; `BookingFormPage.spec.ts` › "AC-9…" |
| AC-10 | `BookingFormPage.spec.ts` › "AC-10…"; e2e "AC-10…" |
| AC-11 | `bookingForm.spec.ts` › "AC-11…"; `time.spec.ts` › "AC-11…"; `BookingFormPage.spec.ts` › "AC-11…"; e2e "AC-11, AC-13…" |
| AC-12 | `bookingForm.spec.ts` › "AC-12…"; `BookingFormPage.spec.ts` › "AC-12, AC-13, AC-14…" |
| AC-13 | `bookingForm.spec.ts` › "AC-13…"; `BookingFormPage.spec.ts` › "AC-12, AC-13, AC-14…"; e2e "AC-11, AC-13…" |
| AC-14 | `bookingForm.spec.ts` › "AC-14…"; `BookingFormPage.spec.ts` › "AC-12, AC-13, AC-14…" |
| AC-15 | `BookingFormPage.spec.ts` › "AC-15…" |
| AC-16 | `BookingFormPage.spec.ts` › two "AC-16…" tests; e2e "AC-16, AC-17…" |
| AC-17 | `BookingFormPage.spec.ts` › "AC-17…"; e2e "AC-16, AC-17…" |
| AC-18 | `BookingControllerTest` › `ac18CreatesBookingForActingUserWithClockCreatedAt` |
| AC-19 | `BookingControllerTest` › `ac19RejectsMissingUserHeaderWith401`, `ac19RejectsUnknownUserWith401` |
| AC-20 | `BookingControllerTest` › `ac20RejectsUnknownRoomWith404`, `ac20RejectsInactiveRoomWith404` |
| AC-21 | `BookingControllerTest` › `ac21RejectsInvalidTimes`, `ac21RejectsBlankTitle`, `ac21RejectsMissingTitleProperty`, `ac21RejectsTitleLongerThan100CharactersAfterTrimming`, `ac21RejectsMissingRequiredFields` |
| AC-22 | `BookingControllerTest` › `ac22AcceptsStartEqualToNow`, `ac22RejectsStartOneStepBeforeNow` |

## Context updates
- `project-context/architecture/api.md` — `POST /api/bookings`, `errors[].field` in snake_case, `X-User-Id` now used.
- `project-context/architecture/overview.md` — new backend/frontend files, page switching.
- `project-context/architecture/data-model.md` — where BR-2/BR-7/BR-8 are checked.
- `project-context/conventions/coding.md` — router comes with the header navigation.
- `project-context/design/README.md` — implementation status of the two screens.

## Risks and notes
- **No router (deviation from conventions/coding.md).** The convention said to add `vue-router@4` with the second page *and* the header navigation; the spec puts the header navigation out of scope (RMB-3), and adding a dependency needs network access this run does not have. `App.vue` switches pages with a `view` ref; the convention now says the router comes with the navigation. Reviewers may prefer the router now.
- `ApiExceptionHandler` now reports `@Valid` field names in snake_case. No existing endpoint had request bodies, so nothing else changes.
- Overlaps are still accepted (A-1, RMB-2). E2E tests use future times and distinct rooms/dates so they do not depend on each other or on the time of day; the today-part of the AC-7 e2e test is skipped only after 23:15 office time, and its timeline assertion runs only when the slot falls inside 08:00–18:00 (the timeline itself is covered by Vitest).
- A non-numeric `X-User-Id` header gives `400` (type mismatch) instead of `401`; the spec only covers missing and unknown ids.
