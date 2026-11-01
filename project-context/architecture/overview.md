# Architecture overview

## Components
| Component | Directory | Tech | Runtime |
|---|---|---|---|
| Web app | `frontend/` | Vue 3 (`<script setup>`), Vite, TypeScript, Pinia | Vite dev server on `WEB_PORT` (default 5201); proxies `/api` to the API |
| API | `backend/` | Java 17, Spring Boot 4 (Spring MVC, Spring Data JPA, Bean Validation), Jackson 3 | Embedded Tomcat on `API_PORT` (default 5202) |
| Database | `backend/data/` (git-ignored) | H2 2.x, file mode; schema by Flyway | Opened by the API; tests and e2e use in-memory H2 |
| E2E tests | `e2e/`, `playwright.config.ts` | Playwright | Starts API (profile `e2e`) and web app itself |

Build tools: Maven wrapper at the root (`./mvnw -f backend/pom.xml …`), npm in the root (Playwright only) and in `frontend/`. The root `Makefile` wraps everything.

## Request flow
1. Browser loads the web app from Vite (`http://localhost:5201`).
2. The app calls `fetch('/api/...')` through `src/api/http.ts`, which adds `X-User-Id` (acting user) and turns non-2xx responses into `ApiError` (from the `ProblemDetail` body).
3. Vite proxies `/api/*` to `http://localhost:${API_PORT}`.
4. Spring MVC: `@RestController` → `@Service` (transaction boundary, returns response records) → Spring Data `JpaRepository` → H2.
5. Jackson writes the response record as snake_case JSON; `Instant` values as ISO 8601 UTC strings.
6. Any exception becomes a `ProblemDetail` in `common/ApiExceptionHandler`.

## Backend layout (`backend/src/main/java/vn/techlead/roombook/`)
Packages by feature; each feature holds its controller, service, repository, entities and DTO records.

| Package | Contents |
|---|---|
| `common/` | `ApiExceptionHandler` (ProblemDetail), `OfficeProperties` (`roombook.office.*`), `TimeConfig` (`Clock` bean) |
| `user/` | `User` entity, `Role`, `UserRepository`, `UserService`, `UserController` (`GET /api/users`), `UserResponse` |
| `room/` | `Room` entity, `Equipment`, `RoomRepository`, `RoomService`, `RoomController` (`GET /api/rooms`), `RoomResponse` |
| `booking/` | `Booking` entity, `BookingRepository`, `SampleBookingSeeder` (startup sample data) |
| `availability/` | `AvailabilityController` (`GET /api/rooms/availability`), `AvailabilityService`, `AvailabilityResponse` |

Layering: controllers only bind and validate input and call one service method; services hold the logic and the `@Transactional` boundary and return DTO records; entities never leave the service layer; repositories are Spring Data interfaces.

Configuration (`backend/src/main/resources/`):
- `application.properties` — port, H2 file URL, `ddl-auto=validate`, Hibernate JDBC time zone UTC, Jackson `SNAKE_CASE`, `roombook.office.time-zone`, `roombook.sample-bookings.enabled`.
- `application-e2e.properties` — profile `e2e`: in-memory database (used by Playwright).
- `backend/src/test/resources/application-test.properties` — profile `test`: in-memory database, no sample bookings. Activated for every test by `maven-surefire-plugin`.
- `db/migration/` — Flyway migrations.

The JVM runs in UTC (`-Duser.timezone=UTC` for `spring-boot:run` and tests; `TimeZone.setDefault(UTC)` in `main`).

## Frontend layout (`frontend/src/`)
| Path | Contents |
|---|---|
| `main.ts` | Creates the app, installs Pinia, imports `@design/tokens.css` (= `project-context/design/tokens.css`) and `styles/base.css` |
| `App.vue` | Header (brand, `UserPicker`) and the page (`RoomListPage`) |
| `pages/` | One component per screen; loads its own data. Today: `RoomListPage.vue` |
| `components/` | Reusable components: `UserPicker.vue`, `RoomTimeline.vue` |
| `api/` | `http.ts` (fetch wrapper, `ApiError`, `X-User-Id`), one module per resource (`rooms.ts`, `users.ts`), `types.ts` (API types, snake_case) |
| `stores/` | Pinia setup stores for state shared across pages. Today: `user.ts` (users, acting user) |
| `utils/` | Pure helpers: `time.ts` (UTC ↔ office time), `equipment.ts` (labels) |
| `config.ts` | `OFFICE_TIME_ZONE` (mirrors the backend property), timeline display hours |
| `styles/base.css` | Global element styles using the tokens |

There is a single page and no router yet.
