---
issue: RMB-4
spec_version: 1
revision: 0
---

# Implementation plan — RMB-4

## Approach
Backend: a new admin controller `room/AdminRoomController` under `/api/admin/rooms` calls one method of the new `room/RoomAdminService` per endpoint. Every service method first calls `UserService.requireAdmin(userId, "Only admins can manage rooms.")`, which answers `401` "Unknown user" for a missing/unknown `X-User-Id` and `403` for an employee (BR-10). `RoomRequest` trims `name` in its compact constructor, so the Bean Validation `@NotBlank`/`@Size(max = 50)` checks apply to the trimmed name (BR-9); case-insensitive uniqueness is checked in the service (`409`) and enforced by the database (V3). "Now" comes from the injected `Clock`; deactivation deletes the room's bookings with `start_at > now` in one JPQL bulk delete (BR-11) and returns the count. Status changes to the current status answer `409`.

Frontend: the second and third screens need routing, so `vue-router@4` is added as `coding.md` prescribes (`src/router/index.ts`, `<RouterView />` in `App.vue`). The header gets a "Manage rooms" link for admins only. `ManageRoomsPage` lists all rooms with status, the in-row confirmation (the upcoming count is re-fetched when the confirmation opens, A-3) and success/error alerts; `RoomFormPage` handles add and edit with client-side validation and maps `409` to the Name error. The success message after saving travels to the Manage rooms screen through a small Pinia store (`stores/notice.ts`) that is consumed once. Both pages show only "Only admins can manage rooms." when the acting user is an employee and react to switching the user.

## Changes
| Area | File(s) | Change |
|---|---|---|
| DB | `backend/src/main/resources/db/migration/V3__room_name_case_insensitive_and_capacity_range.sql` | Generated column `name_key = LOWER(name)` with unique index; `CHECK (capacity BETWEEN 1 AND 100)` |
| API | `room/AdminRoomController.java`, `room/RoomAdminService.java`, `room/RoomRequest.java`, `room/AdminRoomResponse.java`, `room/DeactivateRoomResponse.java` | New admin endpoints (AC-24–AC-28) |
| API | `room/Room.java`, `room/RoomRepository.java` | Constructor, `update`, `activate`/`deactivate`; `findAllByOrderByNameAsc`, `findByNameIgnoreCase` |
| API | `booking/BookingRepository.java`, `booking/RoomBookingCount.java` | Count upcoming bookings per room / for one room; bulk delete of upcoming bookings |
| API | `user/UserService.java` | `requireAdmin` (401/403) |
| Web | `frontend/package.json`, `package-lock.json` | `vue-router@4` (prescribed by coding.md for a second page) |
| Web | `src/router/index.ts`, `src/main.ts`, `src/App.vue` | Routes `/`, `/admin/rooms`, `/admin/rooms/new`, `/admin/rooms/:id/edit`; header link for admins |
| Web | `src/pages/ManageRoomsPage.vue`, `src/pages/RoomFormPage.vue` | New screens per the RMB-4 wireframes |
| Web | `src/api/adminRooms.ts`, `src/api/types.ts`, `src/stores/notice.ts`, `src/utils/roomMessages.ts`, `src/styles/base.css` | API functions, types, one-time notice, message texts, shared `.btn`/`.alert`/`.card` styles |
| Tests | `AdminRoomControllerTest.java`, `App.spec.ts`, `ManageRoomsPage.spec.ts`, `RoomFormPage.spec.ts`, `roomMessages.spec.ts`, `src/testing/fixtures.ts`, `e2e/admin-rooms.spec.ts`, `e2e/rooms.spec.ts` | New tests; the room-list e2e no longer assumes exactly 6 rooms |

## Data model changes
`rooms.name_key` (generated, `LOWER(name)`, unique index `rooms_name_key_idx`) and the check `rooms_capacity_range` (V3). Not mapped in the entity. data-model.md updated.

## Acceptance criteria → tests
| AC | Test(s) |
|---|---|
| AC-1 | `App.spec.ts` › AC-1 (both); `e2e/admin-rooms.spec.ts` › AC-1, AC-4, AC-6, AC-7 / AC-1, AC-2 |
| AC-2 | `ManageRoomsPage.spec.ts` › AC-2; `RoomFormPage.spec.ts` › AC-2; e2e › AC-1, AC-2 |
| AC-3 | `AdminRoomControllerTest` › `ac3_rejectsEmployeeOnEveryAdminEndpointWith403`, `ac3_rejectsMissingOrUnknownUserWith401` |
| AC-4 | `ManageRoomsPage.spec.ts` › AC-4; e2e › AC-1, AC-4, AC-6, AC-7 |
| AC-5 | `ManageRoomsPage.spec.ts` › AC-5 (both) |
| AC-6 | `RoomFormPage.spec.ts` › AC-6; e2e › AC-1, AC-4, AC-6, AC-7 |
| AC-7 | `RoomFormPage.spec.ts` › AC-7; `ManageRoomsPage.spec.ts` › AC-7, AC-10; `AdminRoomControllerTest` › `ac7_…`; e2e › AC-1, AC-4, AC-6, AC-7 |
| AC-8 | `RoomFormPage.spec.ts` › AC-8; e2e › AC-8 |
| AC-9 | `RoomFormPage.spec.ts` › AC-9; e2e › AC-9, AC-10, … |
| AC-10 | `RoomFormPage.spec.ts` › AC-10; `AdminRoomControllerTest` › `ac10_renamedRoomKeepsItsBookings`; e2e › AC-9, AC-10, … |
| AC-11 | `AdminRoomControllerTest` › `ac11_…` |
| AC-12 | `RoomFormPage.spec.ts` › AC-12; e2e › AC-9, AC-10, AC-12, … |
| AC-13 | `RoomFormPage.spec.ts` › AC-13 (reject / save); `AdminRoomControllerTest` › `ac13_…`; e2e |
| AC-14 | `RoomFormPage.spec.ts` › AC-14; `AdminRoomControllerTest` › `ac27_ac14_…`, `ac14_…`; e2e |
| AC-15 | `RoomFormPage.spec.ts` › AC-15; `AdminRoomControllerTest` › `ac15_…` |
| AC-16 | `RoomFormPage.spec.ts` › AC-16 (both) |
| AC-17 | `ManageRoomsPage.spec.ts` › AC-17; `roomMessages.spec.ts` › AC-17; e2e › AC-17, … |
| AC-18 | `AdminRoomControllerTest` › `ac28_ac18_…`; `ManageRoomsPage.spec.ts` › AC-18; `roomMessages.spec.ts` › AC-18; e2e |
| AC-19 | `AdminRoomControllerTest` › `ac19_…` |
| AC-20 | `ManageRoomsPage.spec.ts` › AC-20; e2e |
| AC-21 | `AdminRoomControllerTest` › `ac21_…`; e2e |
| AC-22 | `AdminRoomControllerTest` › `ac28_ac22_…`; `ManageRoomsPage.spec.ts` › AC-22; e2e |
| AC-23 | `ManageRoomsPage.spec.ts` › AC-23 (both) |
| AC-24 | `AdminRoomControllerTest` › `ac24_…` |
| AC-25 | `AdminRoomControllerTest` › `ac25_…` |
| AC-26 | `AdminRoomControllerTest` › `ac26_…` (both) |
| AC-27 | `AdminRoomControllerTest` › `ac27_…` (parameterized, 50 chars, unknown equipment, 409) |
| AC-28 | `AdminRoomControllerTest` › `ac28_…` (deactivate, activate, 409, 404) |

## Context updates
`architecture/api.md`, `architecture/data-model.md`, `architecture/overview.md`, `conventions/coding.md` (router now exists), `conventions/testing.md` (e2e rooms added by tests).

## Risks and notes
- RMB-1 (booking) is still in Code Review and not on `develop`: there is no booking form and no `POST /api/bookings` on this branch. The parts of AC-7, AC-10, AC-21 and AC-22 that mention the booking form's Room select or `POST /api/bookings` cannot be tested here. RMB-1's booking form is expected to fill its Room select from `GET /api/rooms` and to reject inactive rooms with `404`; both are covered for `GET /api/rooms` by the tests above. They should be re-checked once both stories are merged.
- AC-28 leaves the response shape of deactivate open ("the room … and `cancelled_bookings`"); it is `{"room": {...}, "cancelled_bookings": n}` and documented in api.md.
- The admin check runs in the service, after request-body validation: an employee sending an invalid body gets `400`, not `403`. With a valid body the answer is `403` (AC-3).
- e2e tests create their own rooms (unique names) and never change the seed rooms, so they stay independent; the room-list e2e test checks the seed rooms instead of an exact count.
