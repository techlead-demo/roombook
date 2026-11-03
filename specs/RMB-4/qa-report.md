---
issue: RMB-4
result: fail
tested_sha: 4906c4f
run: 1
date: 2026-11-03
---

# QA report — RMB-4 (run 1)

## Result
FAIL — 1 in-scope defect (BR-9 / AC-27): the admin API accepts a fractional capacity and silently stores it truncated. All 28 acceptance criteria otherwise pass.

## Environment
Commit 4906c4f on feat/RMB-4 (plus this QA commit, which adds tests only). Web on :5211, API on :5212. Automated: profile `test` (MockMvc, fixed clock 2026-11-02T03:00:00Z) and profile `e2e` (fresh in-memory DB, Playwright Chromium). Exploration: `make dev` with the file database, seed data plus today's sample bookings (3 Nov 2026, ~09:15 office time).

## Results
| Case | AC | Status | Note |
|---|---|---|---|
| TC-1 | AC-1 | passed | |
| TC-2 | AC-1 | passed | |
| TC-3 | AC-2 | passed | see observation 1 (brief state before the user list has loaded) |
| TC-4 | AC-2 | passed | |
| TC-5 | AC-2 | passed | |
| TC-6 | AC-3 | passed | |
| TC-7 | AC-3 | passed | all 5 endpoints, header missing and `99` |
| TC-8 | AC-4 | passed | also verified in the browser |
| TC-9 | AC-5 | passed | |
| TC-10 | AC-6 | passed | |
| TC-11 | AC-7 | passed | |
| TC-12 | AC-8 | passed | |
| TC-13 | AC-9 | passed | |
| TC-14 | AC-10 | passed | |
| TC-15 | AC-11 | passed | |
| TC-16 | AC-12 | passed | |
| TC-17 | AC-13 | passed | UI rejects 2.5; the API does not (TC-38) |
| TC-18 | AC-13 | passed | |
| TC-19 | AC-14 | passed | also in the browser against an out-of-service Ha Long |
| TC-20 | AC-14 | passed | |
| TC-21 | AC-15 | passed | |
| TC-22 | AC-16 | passed | |
| TC-23 | AC-17 | passed | browser: "Take Ha Long out of service? 1 upcoming booking will be cancelled. …" with today's sample bookings |
| TC-24 | AC-18 | passed | browser: "Ha Long is out of service. 1 booking cancelled." |
| TC-25 | AC-19 | passed | |
| TC-26 | AC-20 | passed | |
| TC-27 | AC-21 | passed | |
| TC-28 | AC-22 | passed | |
| TC-29 | AC-23 | passed | |
| TC-30 | AC-24 | passed | |
| TC-31 | AC-25 | passed | |
| TC-32 | AC-26 | passed | |
| TC-33 | AC-27 | passed | |
| TC-34 | AC-28 | passed | |
| TC-35 | AC-27 | passed | |
| TC-36 | — | passed | |
| TC-37 | AC-14 | passed | |
| TC-38 | AC-27 | failed | see D-1 |
| TC-39 | — | passed | regression of RMB-1 / room list e2e |

Suites on the final commit:
- `make lint`: passed.
- Backend `./mvnw -f backend/pom.xml -B -ntp test`: 83 tests, 82 passed, 1 failed (`AdminRoomQaTest.tc38_br9_ac27_rejectsFractionalCapacityWith400`, D-1).
- Frontend `npm test --prefix frontend`: 11 files, 85 tests passed.
- E2E `make e2e`: 39 passed, 0 failed. It ran before the D-1 test was added. That test only adds a backend test file and doesn't touch application or e2e code, so the e2e result still applies to the final commit. E2E couldn't be run again after exploration started because the dev server holds the job's ports.

## In-scope defects
### D-1 Admin API accepts a fractional capacity and stores it truncated
- AC: AC-27 (BR-9: "Its capacity is a whole number from 1 to 100")
- Steps: `POST /api/admin/rooms` with `X-User-Id: 1` and body `{"name":"Nha Trang","capacity":2.5,"equipment":[]}` (same for `PUT /api/admin/rooms/3` with `"capacity":6.5`).
- Expected: `400` ProblemDetail and nothing stored, as for the other invalid capacities. A capacity that isn't a whole number breaks BR-9, and the UI rejects the same value under AC-13.
- Actual: `201` with `"capacity":2`. Jackson coerces the float into the `Integer` field, so the room is stored with a capacity the admin never entered. Reproduced in MockMvc and against the running API (`{"id":7,"name":"QA Float","capacity":2,…}`).
- Failing test: backend/src/test/java/vn/techlead/roombook/room/AdminRoomQaTest.java › tc38_br9_ac27_rejectsFractionalCapacityWith400
- Evidence: test output (`Status expected:<400> but was:<201>`, response body `"capacity":2`).

## Out-of-scope bugs (proposed)
None.

## Observations (not defects)
1. On a direct URL as an employee, while `GET /api/users` is still loading, the acting user isn't known yet. For that moment the Manage rooms screen shows its heading, the "Add room" link and "Loading rooms…". No rooms are requested or shown. Once the user list has loaded, only the alert shows, as AC-2 requires. The spec doesn't define this state. Screenshots: `qa/TC-3-employee-before-users-load.png` (users request delayed by 1.5 s on purpose), `qa/TC-3-employee-no-access.png`.
2. "Take out of service" reloads the room list to get a fresh upcoming-bookings count (A-3). If that reload fails, the message is "Could not change the room. Try again later." even though nothing was being changed. The spec doesn't cover this case.
3. Rooms with capacity 1 read "Up to 1 people". This is the spec's own pattern ("Up to <capacity> people"), so it's a note for the BA only.

## Design comparison
| Screen | Mockup / wireframe | Result |
|---|---|---|
| Header | specs/RMB-4/wireframes/manage-rooms.html | Matches: "Manage rooms" nav link only for admins, shown bold while active. The brand is now a link to the start page (fine; the spec keeps the rest of the header). |
| Manage rooms (default, out of service, confirmation, success) | specs/RMB-4/wireframes/manage-rooms.html | Matches the layout: cards with name, "Up to n people", chips, status chip, Edit + danger/neutral action; out-of-service row muted; confirmation inside the row under a divider; success alert above the list (`qa/TC-23-confirmation.png`, `qa/TC-24-out-of-service.png`). |
| Room form (add, edit, validation, server error) | specs/RMB-4/wireframes/room-form.html | Matches: fields, capacity hint, field errors under the field, the hint replaced by the capacity error, checkboxes in the order TV, Whiteboard, Video conference (`qa/TC-19-duplicate-name.png`). "Cancel" is a button, not a link (cosmetic). |
| No access | both wireframes | Matches after the user list has loaded (observation 1). |
