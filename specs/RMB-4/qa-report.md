---
issue: RMB-4
result: pass
tested_sha: c0e4ac9
run: 2
date: 2026-11-03
---

# QA report — RMB-4 (run 2)

## Result
PASS. D-1 from run 1 is fixed: a fractional capacity now gets a `400` and nothing is stored. All 28 acceptance criteria pass, there are no in-scope defects, and lint, the backend, frontend and e2e suites pass.

## Environment
Commit c0e4ac9 on feat/RMB-4, plus this QA commit, which only adds tests, the report and screenshots. Web on :5211, API on :5212.
- Automated: profile `test` (MockMvc, fixed clock 2026-11-02T03:00:00Z) and profile `e2e` (fresh in-memory DB, Playwright Chromium).
- Exploration: `make dev` with the file database and seed data.

Changes since run 1 (3826983..c0e4ac9):
- `spring.jackson.deserialization.accept-float-as-int=false` (global).
- `AdminAccessInterceptor` is now a `@Component`, registered in the new `common/WebConfig`.
- Javadoc and project-context updates.

Two regression cases were added for these changes (TC-40, TC-41).

## Results
| Case | AC | Status | Note |
|---|---|---|---|
| TC-1 | AC-1 | passed | |
| TC-2 | AC-1 | passed | |
| TC-3 | AC-2 | passed | observation 1 of run 1 still applies |
| TC-4 | AC-2 | passed | |
| TC-5 | AC-2 | passed | |
| TC-6 | AC-3 | passed | |
| TC-7 | AC-3 | passed | |
| TC-8 | AC-4 | passed | also in the browser |
| TC-9 | AC-5 | passed | |
| TC-10 | AC-6 | passed | |
| TC-11 | AC-7 | passed | |
| TC-12 | AC-8 | passed | |
| TC-13 | AC-9 | passed | |
| TC-14 | AC-10 | passed | |
| TC-15 | AC-11 | passed | |
| TC-16 | AC-12 | passed | |
| TC-17 | AC-13 | passed | browser: 2.5 shows the capacity error (`qa/TC-17-fractional-capacity.png`) |
| TC-18 | AC-13 | passed | browser: capacity 100 saved, "Added QA Run2 Room." (`qa/TC-18-capacity-100-saved.png`) |
| TC-19 | AC-14 | passed | |
| TC-20 | AC-14 | passed | |
| TC-21 | AC-15 | passed | |
| TC-22 | AC-16 | passed | |
| TC-23 | AC-17 | passed | |
| TC-24 | AC-18 | passed | |
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
| TC-38 | AC-27 | passed | D-1 fixed; also against the running API (POST 2.5 and PUT 6.5 → `400`, rooms unchanged) |
| TC-39 | — | passed | |
| TC-40 | AC-3 | passed | new: the interceptor in `WebConfig` still answers `403` / `401` before the body is read |
| TC-41 | — | passed | new: the global Jackson setting also rejects `room_id` 1.5 on `POST /api/bookings` with `400` (it would have been truncated to room 1 before) |

Suites on the final commit:
- `make lint`: passed.
- Backend `./mvnw -f backend/pom.xml -B -ntp test`: 85 tests, all passed.
- Frontend `npm test --prefix frontend`: 11 files, 85 tests, all passed.
- E2E `make e2e`: 39 passed, 0 failed.

## In-scope defects
None. D-1 from run 1 (fractional capacity truncated) is fixed and verified by TC-38.

## Out-of-scope bugs (proposed)
None.

## Observations (not defects)
1. A fractional capacity on the API answers `400` with detail "Failed to read request" and no `errors` entry. The same is true for an unknown equipment value. This matches api.md and AC-27, which only requires `400` for an unreadable value.
2. The `accept-float-as-int=false` setting is global. A whole number written as a float (e.g. `10.0`) is now rejected for every integer property too. No client sends such values: the frontend sends JSON integers.
3. Observations 1–3 of run 1 still apply: the brief state before the user list loads, the error text when the reload before the confirmation fails, and "Up to 1 people".
4. Reviewer item, outside QA scope: `project-context/business/overview.md` still lists "Any administration screen" as not in the product. A BA or a human must update it before merge.

## Design comparison
| Screen | Mockup / wireframe | Result |
|---|---|---|
| Header | specs/RMB-4/wireframes/manage-rooms.html | Matches, unchanged since run 1. |
| Manage rooms | specs/RMB-4/wireframes/manage-rooms.html | Matches: cards, chips, status chip, actions, success alert (`qa/TC-18-capacity-100-saved.png`). |
| Room form | specs/RMB-4/wireframes/room-form.html | Matches: the capacity error replaces the hint under the field (`qa/TC-17-fractional-capacity.png`). |
| No access | both wireframes | Matches, as in run 1. |
