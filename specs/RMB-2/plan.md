---
issue: RMB-2
spec_version: 1
revision: 0
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
| Tests | BookingControllerTest, new BookingConcurrencyTest, BookingFormPage.spec.ts, e2e/booking-overlap.spec.ts | AC tests |

## Data model changes
None. data-model.md: new invariant (BR-12, enforced by `BookingService` with a room row lock).

## Acceptance criteria → tests
| AC | Test(s) |
|---|---|
| AC-1 | BookingControllerTest › AC-1 rejects identical times with 409 |
| AC-2 | BookingControllerTest › AC-2 rejects partial overlaps (parameterized) |
| AC-3 | BookingControllerTest › AC-3 accepts adjacent bookings (parameterized) |
| AC-4 | BookingControllerTest › AC-4 names the earliest conflicting booking |
| AC-5 | BookingControllerTest › AC-5 other room is not a conflict |
| AC-6 | BookingControllerTest › AC-6 own booking conflicts |
| AC-7 | BookingControllerTest › AC-7 ongoing booking conflicts |
| AC-8 | BookingControllerTest › AC-8 cross-midnight message |
| AC-9 | BookingControllerTest › AC-9 earlier checks answer first (several) |
| AC-10 | BookingConcurrencyTest › AC-10 concurrent requests store one booking |
| AC-11 | BookingFormPage.spec.ts › AC-11; e2e/booking-overlap.spec.ts › AC-11, AC-12 |
| AC-12 | e2e/booking-overlap.spec.ts › AC-11, AC-12 |
| AC-13 | BookingFormPage.spec.ts › AC-13; e2e/booking-overlap.spec.ts › AC-13 |
| AC-14 | BookingControllerTest › AC-14 existing overlaps are kept and block new bookings |

## Context updates
- project-context/architecture/api.md: `409` row, check order, remove "Overlapping bookings are still accepted".
- project-context/architecture/data-model.md: BR-12 invariant and how it is enforced.

## Risks and notes
- The room row lock waits for H2's lock timeout; bookings are short transactions, so contention is negligible
  for a small office.
- Existing overlapping rows stay (A-6); they are only read.
