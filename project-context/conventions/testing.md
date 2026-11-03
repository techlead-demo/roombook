# Testing conventions

Every acceptance criterion has at least one automated test; the test name or a comment names the behaviour it proves. Bug fixes start with a failing regression test.

## Levels
| Level | Tool | Location | Naming | Run |
|---|---|---|---|---|
| API / backend | JUnit 5, Spring Boot Test, MockMvc | `backend/src/test/java/vn/techlead/roombook/<feature>/` | `<Class>Test.java`, methods describe behaviour (`rejectsInvalidDateWithProblemDetail`) | `./mvnw -f backend/pom.xml test` (one class: `-Dtest=AvailabilityControllerTest`) |
| Frontend unit | Vitest, @vue/test-utils, jsdom | next to the code in `frontend/src/` | `<file>.spec.ts` | `npm test --prefix frontend` (one file: `npm test --prefix frontend -- src/utils/time.spec.ts`) |
| End to end | Playwright | `e2e/` | `<feature>.spec.ts` | `npx playwright test` (one file: `npx playwright test e2e/rooms.spec.ts`) |

What goes where:
- Business rules, validation, error responses, time-zone conversion, JSON shape: backend MockMvc tests.
- Pure helpers and component rendering logic: Vitest.
- User-visible flows across UI and API (one happy path per screen plus key error messages): Playwright.

## Backend
- Tests are full-context API tests: `@SpringBootTest` + `@AutoConfigureMockMvc` (`org.springframework.boot.webmvc.test.autoconfigure`) and `@Autowired MockMvc`. Profile `test` is active automatically (in-memory H2, Flyway seed data, no sample bookings).
- Annotate the class `@Transactional` when a test writes data, so it is rolled back. Create bookings through the repositories (`new Booking(room, user, title, startAt, endAt, createdAt)`) with fixed `Instant.parse("...Z")` values; look up seed rooms/users by name/email (`roomRepository.findByName("Ha Long")`).
- Assert the JSON contract literally: snake_case names and exact UTC strings (`jsonPath("$.day_start").value("2026-11-01T17:00:00Z")`).
- Error tests assert status, `contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)`, `$.status`, `$.title` and the relevant part of `$.detail`.
- Time rules get boundary tests: office midnight (17:00 UTC), exactly on a limit and one step over, 15-minute step edges.
- Code that needs "now" uses the `Clock` bean; tests that depend on now override it with `@MockitoBean Clock` or a `@TestConfiguration` returning `Clock.fixed(...)`.
- Concurrency tests (e.g. `BookingConcurrencyTest`) are not `@Transactional` and delete their data afterwards. To force an interleaving, spy the repository with `@MockitoSpyBean` and hold one request at the critical step with a latch; repositories are JDK proxies, so forward through `mockingDetails(spy).getMockCreationSettings().getDefaultAnswer()` instead of `callRealMethod()`.

## Frontend
- Pure functions: plain Vitest `describe`/`it`/`expect`, with fixed ISO strings and the zone `'Asia/Ho_Chi_Minh'`.
- Components: `mount(Component, { props })` from `@vue/test-utils`; assert rendered text and attributes, not internals.
- Components that use a store: `setActivePinia(createPinia())` in `beforeEach`; mock API modules with `vi.mock('@/api/rooms')`.

## End to end
- `playwright.config.ts` starts the API with profile `e2e` (fresh in-memory database: seed users and rooms, plus today's sample bookings) and the Vite dev server, on `API_PORT`/`WEB_PORT`. Outside CI, servers already running on those ports are reused.
- Tests run one at a time (`workers: 1`) against one database. Each test creates the data it needs through the UI or API, uses unique titles, and does not depend on other tests or on data created by them.
- Locate by role, label and text (`getByRole('heading', { name: 'Rooms' })`, `getByLabel('Acting as')`); `getByTestId` only where the app defines a `data-testid`.
- Times on screen are office time; a test that books uses future 15-minute-aligned times.
- Overlapping bookings of a room are rejected (BR-12): a test that books today uses Sa Pa (no sample bookings) and skips slots already busy in `/api/rooms/availability`; a test that books another day picks a day and time no other test books in that room.
- Browsers: `npx playwright install chromium` once per machine.

## Test data
- Users (V2): An Nguyen (ADMIN), Binh Tran, Chi Le, Dung Pham, Hoa Vo, Khanh Do — emails `<first>.<last>@roombook.local`.
- Rooms (V2): Da Lat 4 (WHITEBOARD), Ha Long 12 (TV, WHITEBOARD, VIDEO_CONFERENCE), Hoi An 8 (TV, VIDEO_CONFERENCE), Hue 6 (TV, WHITEBOARD), Phu Quoc 20 (all three), Sa Pa 2 (none). All active.
- Sample bookings (dev and e2e only, today in office time): Hue 08:30–09:00 and 16:00–17:00, Ha Long 09:00–10:00 and 14:00–15:30, Hoi An 10:30–11:30, Da Lat 11:00–12:15, Phu Quoc 13:00–14:00. Sa Pa is free all day.
