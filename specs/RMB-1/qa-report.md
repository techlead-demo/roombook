---
issue: RMB-1
result: pass
tested_sha: 5d1edd5
run: 1
date: 2026-11-03
---

# QA report — RMB-1 (run 1)

## Result
PASS — all 22 ACs have passing cases; no in-scope defects; lint, backend, frontend and e2e suites green. Two observations (not AC violations) for the human reviewer below.

## Environment
Commit 5d1edd5 on feat/RMB-1 (base develop), web on :5211, API on :5212. Automated runs: backend profile `test` (in-memory H2, fixed clocks in the booking tests), e2e profile `e2e` (fresh in-memory H2 with today's sample bookings, real clock: Tue 3 Nov 2026 ~03:07 office time). Exploration: `make dev` (file H2, sample bookings seeded for 2026-11-03), Chromium via Playwright, acting as Binh Tran.

## Results
| Case | AC | Status | Note |
|---|---|---|---|
| TC-1 | AC-1 | passed | |
| TC-2 | AC-2 | passed | |
| TC-3 | AC-3 | passed | also manual, qa/TC-3-booking-form-default.png |
| TC-4 | AC-4 | passed | |
| TC-5 | AC-5 | passed | |
| TC-6 | AC-6 | passed | also manual: 201 with user_id 2, message "Booked Ha Long, Tue 3 Nov 2026, 11:00–12:00.", qa/TC-6-success-message.png |
| TC-7 | AC-6 | passed | Engineer's test |
| TC-8 | AC-7 | passed | Engineer's e2e (timeline part skipped by design at 03:xx); timeline verified manually (Ha Long 11:00–12:00 block today) |
| TC-9 | AC-8 | passed | |
| TC-10 | AC-9 | passed | Engineer's test |
| TC-11 | AC-10 | passed | |
| TC-12 | AC-11 | passed | also manual, qa/TC-12-step-error.png |
| TC-13 | AC-11 | passed | |
| TC-14 | AC-12 | passed | |
| TC-15 | AC-12 | passed | |
| TC-16 | AC-13 | passed | |
| TC-17 | AC-13 | passed | Engineer's component test |
| TC-18 | AC-14 | passed | |
| TC-19 | AC-14 | passed | |
| TC-20 | AC-15 | passed | |
| TC-21 | AC-16 | passed | |
| TC-22 | AC-16 | passed | |
| TC-23 | AC-17 | passed | |
| TC-24 | AC-18 | passed | Engineer's test |
| TC-25 | AC-19 | passed | Engineer's test; also manual (no header and empty header → 401) |
| TC-26 | AC-19 | passed | Engineer's tests |
| TC-27 | — | passed | 400, see observation O-1 |
| TC-28 | AC-20 | passed | Engineer's test |
| TC-29 | AC-20 | passed | Engineer's test |
| TC-30 | AC-21 | passed | Engineer's test |
| TC-31 | AC-21 | passed | Engineer's test |
| TC-32 | AC-21 | passed | Engineer's test |
| TC-33 | AC-21 | passed | |
| TC-34 | AC-21 | passed | Engineer's tests |
| TC-35 | AC-21 | passed | Engineer's tests |
| TC-36 | AC-21 | passed | Engineer's test |
| TC-37 | AC-22 | passed | Engineer's tests |
| TC-38 | — | passed | |
| TC-39 | — | passed | |
| TC-40 | — | passed | manual, see design comparison |
| TC-41 | — | passed | |
| TC-42 | — | passed | |
| TC-43 | — | passed | |
| TC-44 | AC-21 | passed | |
| TC-45 | — | passed | manual, see observation O-2 |

Lint: `make lint` passed. Backend: 39 tests, 0 failures (33 Engineer + 6 QA). Frontend (Vitest): 36 passed. E2E (Playwright): 29 passed (8 Engineer booking, 19 QA, 2 existing room list).

## In-scope defects
None.

## Out-of-scope bugs (proposed)
None.

## Observations (no AC violated; for the reviewer to decide)
- **O-1 Non-numeric `X-User-Id` gives 400, not 401.** `POST /api/bookings` with `X-User-Id: abc` answers `400` "Invalid value 'abc' for parameter 'X-User-Id'." (nothing stored). AC-19 only names a missing header and `99`, which both give 401. `project-context/architecture/api.md` says an endpoint answers 401 when the header "is missing or not a known user id"; the web app only ever sends numeric ids. The Engineer's plan lists this as a known deviation.
- **O-2 Deep link `/book/<unknown id>` opens a form with no room selected.** `/book/999` shows an empty Room select and the side-panel heading "· Tue 3 Nov 2026" (qa/TC-45-deep-link-unknown-room.png). The spec only opens the form from the "Book" button, so no AC applies; submitting would get the API's 404 alert. The reviewer already mentioned this in review 2.
- `created_at` is returned with nanosecond precision from the system clock (e.g. `2026-11-02T20:09:19.243228565Z`). That is still ISO 8601 UTC, and AC-18 (clock time) passes.

## Design comparison
| Screen | Mockup | Result |
|---|---|---|
| Booking form, default | design/screens/booking-form.html | Matches: heading, field order and labels, two-column Start/End, hint, Title, "Book room" (primary) + "Cancel", side panel heading, "Already booked: …" and the 08–18 timeline. Without the header navigation and search subtitle, as the spec says. The time input shows "09:10 AM" in the test browser's en-US locale (browser rendering, cosmetic). |
| Booking form, 15-minute step error | design/screens/booking-form.html | Matches: red border on Start and `.field-error` text under it (qa/TC-12-step-error.png) |
| Room list with success message | design/screens/room-list.html | Matches: "Book" button at the right of each card, green `.alert-success` above the list (qa/TC-6-success-message.png). The header navigation is missing, as the spec says (RMB-3). |
