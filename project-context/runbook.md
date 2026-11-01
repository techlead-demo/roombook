# Runbook

All commands run from the repository root, one command per shell call.

## Prerequisites
- JDK 17 or newer, with `JAVA_HOME` pointing to it (the build stops with "RoomBook needs JDK 17 or newer" otherwise). Maven itself comes from the wrapper (`./mvnw`).
- Node.js 24 and npm.
- For e2e only: Playwright browsers (`npx playwright install chromium`, once per machine).

## Ports and environment
| Variable | Default | Used by |
|---|---|---|
| `API_PORT` | 5202 | Spring Boot (`server.port=${API_PORT:5202}`), Vite proxy target, Playwright |
| `WEB_PORT` | 5201 | Vite dev server, Playwright `baseURL` |

The `Makefile` exports both with these defaults. Other settings: `backend/src/main/resources/application.properties` (`roombook.office.time-zone`, `roombook.sample-bookings.enabled`).

## Install
`make install` — Maven dependencies and compile (`./mvnw -f backend/pom.xml dependency:go-offline test-compile`), `npm ci` in the root (Playwright) and in `frontend/`.

## Run
- `make dev` — API on `http://localhost:5202`, web app on `http://localhost:5201` (Ctrl+C stops both).
- Separately: `make dev-backend` (`./mvnw -f backend/pom.xml spring-boot:run`) and `make dev-frontend` (`npm run dev --prefix frontend`).
- Quick API check: `curl http://localhost:5202/api/rooms`.

## Test
| What | Command |
|---|---|
| All unit/API tests | `make test` (backend, then frontend) |
| Backend only | `./mvnw -f backend/pom.xml test` |
| One backend class / method | `./mvnw -f backend/pom.xml test -Dtest=AvailabilityControllerTest` / `-Dtest=AvailabilityControllerTest#rejectsInvalidDateWithProblemDetail` |
| Frontend only | `npm test --prefix frontend` |
| One frontend spec | `npm test --prefix frontend -- src/utils/time.spec.ts` |
| Lint (backend compile + `vue-tsc --noEmit`) | `make lint` |
| E2E | `make e2e` (= `npx playwright test`) |
| One e2e file | `npx playwright test e2e/rooms.spec.ts` |
| List e2e tests (no browser needed) | `npx playwright test --list` |

`make e2e` starts the API with profile `e2e` (fresh in-memory database) and the web app on the env ports, unless servers are already running on them (outside CI they are reused). Reports: `playwright-report/`, traces and screenshots of failures in `test-results/`.

## Data
- Local database: H2 file `backend/data/roombook.mv.db` (git-ignored), created on first start. Flyway applies the migrations in `backend/src/main/resources/db/migration/` (users and rooms are seeded by `V2`).
- Sample bookings: on every start, if today (office time) has no bookings, `SampleBookingSeeder` adds 7 bookings for today (list in conventions/testing.md). Disable with `roombook.sample-bookings.enabled=false`.
- Reset: stop the API, then `make reset-db` (deletes `backend/data/`); the next start recreates and reseeds it.
- Tests (profile `test`) and e2e (profile `e2e`) use in-memory databases and never touch the file.

## Troubleshooting
| Symptom | Fix |
|---|---|
| `RoomBook needs JDK 17 or newer` or `release version 17 not supported` | Set `JAVA_HOME` to a JDK 17 installation |
| `Port 5202 was already in use` / Vite `Port 5201 is already in use` | Stop the other process or set `API_PORT` / `WEB_PORT` |
| Flyway `Validate failed` / checksum mismatch, or schema validation errors after switching branches | Stop the API and run `make reset-db` |
| Web app shows "Could not load rooms" | The API is not running on `API_PORT`; start it (`make dev-backend`) |
| Playwright: `Executable doesn't exist` | `npx playwright install chromium` |
