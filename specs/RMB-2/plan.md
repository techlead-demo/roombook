---
issue: RMB-2
spec_version: 1
revision: 2
---

# Implementation plan — RMB-2

## Approach
`BookingService.create` gets a last check (after user, body, room and time rules, AC-9): it looks for the
earliest-starting booking of the same room with `start_at < new.end_at` and `end_at > new.start_at` (half-open
intervals, BR-12) and, if there is one, throws an `ErrorResponseException` with a `409` ProblemDetail whose
`detail` is formatted in office time (BR-5): "<room> is already booked from HH:mm to HH:mm on Mon 2 Nov 2026. …",
or the "from HH:mm on <date> to HH:mm on <date>" form when the conflicting booking's start and end fall on
different office days.

Concurrency (AC-10): the room is loaded with a pessimistic write lock (`SELECT … FOR UPDATE`) in the same
transaction as the overlap check and the insert. Two requests for the same room are serialised on the room row;
the second one only runs its overlap query after the first commits (H2 default isolation is read committed), so
it sees the new booking and answers `409`. Requests for different rooms do not block each other. No schema
change is needed; a database constraint (exclusion constraint) is not available in H2.

Frontend: `BookingFormPage` already shows the API `detail` above the form and keeps the inputs (RMB-1 AC-16).
New: after a `409` answer it calls `loadAvailability()` so the side panel shows the conflicting booking (AC-13).

## Changes
| Area | File(s) | Change |
|---|---|---|
| API | backend/.../room/RoomRepository.java | `findByIdForUpdate` with `@Lock(PESSIMISTIC_WRITE)` |
| API | backend/.../booking/BookingRepository.java | `findOverlappingInRoom(roomId, from, to)` ordered by start |
| API | backend/.../booking/BookingService.java | Lock room, overlap check, 409 message |
| Web | frontend/src/pages/BookingFormPage.vue | Reload availability after a 409 |
| Tests | new BookingOverlapTest, new BookingConcurrencyTest, BookingFormPage.spec.ts, e2e/booking-overlap.spec.ts | AC tests |
| Tests | e2e/booking.spec.ts | RMB-1 AC-7 books a free slot of Sa Pa (no sample bookings), since BR-12 now rejects overlaps |

## Data model changes
None. data-model.md: new invariant (BR-12, enforced by `BookingService` with a room row lock).

## Acceptance criteria → tests
| AC | Test(s) |
|---|---|
| AC-1 | BookingOverlapTest › ac1RejectsTheSameTimesWith409 |
| AC-2 | BookingOverlapTest › ac2RejectsEveryKindOfOverlap (parameterized) |
| AC-3 | BookingOverlapTest › ac3AcceptsBackToBackBookings (parameterized) |
| AC-4 | BookingOverlapTest › ac4NamesTheEarliestStartingConflict |
| AC-5 | BookingOverlapTest › ac5AcceptsTheSameTimeInAnotherRoom |
| AC-6 | BookingOverlapTest › ac6RejectsOverlapWithTheActingUsersOwnBooking |
| AC-7 | BookingOverlapTest › ac7RejectsOverlapWithABookingInProgress |
| AC-8 | BookingOverlapTest › ac8NamesBothDatesForABookingAcrossMidnight |
| AC-9 | BookingOverlapTest › ac9UnknownUserIsAnsweredBeforeTheOverlap, ac9FieldErrorsAreAnsweredBeforeTheOverlap (parameterized), ac9PastStartIsAnsweredBeforeTheOverlap |
| AC-10 | BookingConcurrencyTest › ac10ExactlyOneOfTwoSimultaneousRequestsIsBooked |
| AC-11 | BookingFormPage.spec.ts › RMB-2 AC-11: shows the overlap error above the form, keeps the inputs and reports no booking; e2e/booking-overlap.spec.ts › AC-11, AC-12: an overlapping booking shows the API error and keeps the form; a free time then books |
| AC-12 | e2e/booking-overlap.spec.ts › AC-11, AC-12: an overlapping booking shows the API error and keeps the form; a free time then books |
| AC-13 | BookingFormPage.spec.ts › RMB-2 AC-13: reloads the side panel after a 409 and shows the new busy time; e2e/booking-overlap.spec.ts › AC-13: after a 409 the side panel reloads and shows the booking made meanwhile |
| AC-14 | BookingOverlapTest › ac14KeepsExistingOverlapsAndRejectsNewBookingsThatOverlapThem |

## Context updates
- project-context/architecture/api.md: `409` row, check order, remove "Overlapping bookings are still accepted".
- project-context/architecture/data-model.md: BR-12 invariant and how it is enforced.

## Risks and notes
- The room row lock waits for H2's lock timeout; bookings are short transactions, so contention is negligible
  for a small office.
- Existing overlapping rows stay (A-6); they are only read.

## Revision 2
| Feedback item | Resolution |
|---|---|
| [blocker] CI e2e: RMB-1 AC-7 (`e2e/booking.spec.ts`) collides with the seeded Hoi An 10:30–11:30 booking | Fixed: the test books Sa Pa (no sample bookings) and skips every 15-minute slot already busy in today's availability (also covers a CI retry or a reused server). The other e2e tests book future days only, so no sample booking can hit them. |
| [minor] AC-10 concurrency test does not prove the lock is needed | Fixed: a `@MockitoSpyBean` on `BookingRepository` holds the first request after its overlap query until the second request runs its own (max 500 ms, below H2's lock timeout). Verified locally: with `findById` instead of `findByIdForUpdate` the test fails with `[201, 201]`. |
| [minor] Plan names BookingControllerTest instead of BookingOverlapTest | Fixed: Changes table and AC → test mapping list the actual classes and test names. |
| [nit] The two overlap e2e tests can pick the same random date | Fixed: both dates come from one random base per run (offset 0 and 1). |
| Found while running e2e (beyond the feedback): en-GB `Intl` writes September as "Sept", the API as "Sep", so the overlap e2e test failed for September dates | Fixed: `formatCalendarDate` (frontend) and the e2e `displayDate` helpers use three-letter months; Vitest case for September added. |
