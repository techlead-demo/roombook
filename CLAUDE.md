# RoomBook

Meeting-room booking for a small office. Web app (Vue 3 + Vite + TypeScript + Pinia) + REST API (Java 17, Spring Boot 4, Spring Data JPA) + H2 database (file, schema by Flyway).

## Read before working
- Business: project-context/business/overview.md, rules.md, glossary.md
- Architecture: project-context/architecture/overview.md (then data-model.md / api.md as needed; decisions/ for ADRs)
- Conventions: project-context/conventions/coding.md, testing.md, git.md
- Design: project-context/design/README.md (mockups in design/screens/, tokens in design/tokens.css)
- How to run and test: project-context/runbook.md

## Non-negotiable rules
- JSON property names are snake_case (global Jackson `SNAKE_CASE`). TypeScript API types use the same snake_case names; no case conversion layer.
- API base path is `/api`.
- Date-times are stored and transferred as ISO 8601 UTC (`Instant`, e.g. `"2026-11-02T02:00:00Z"`). Never use `LocalDateTime` in entities, DTOs or the API.
- The office time zone (`roombook.office.time-zone`, Asia/Ho_Chi_Minh) is used only to interpret calendar dates (`YYYY-MM-DD`) and to display times. Convert at the edges with `OfficeProperties` (backend) and `src/utils/time.ts` (frontend).
- Bookings are in 15-minute steps (start and end at :00, :15, :30 or :45).
- Every API error is an RFC 7807 `ProblemDetail` (`application/problem+json`), produced through `ApiExceptionHandler`.
- Schema changes go in a new Flyway migration `backend/src/main/resources/db/migration/V<n>__<description>.sql`. Never edit a migration once merged.
- Inject `java.time.Clock`; never call `Instant.now()` / `LocalDate.now()` without it.
- Every acceptance criterion has at least one automated test (JUnit/MockMvc, Vitest or Playwright).
- If you change the data model, API, a business rule, a command or a convention, update the matching project-context file in the same change.
- Run one command per shell call: no `&&`, `;` or `|`. Use the make targets or the single commands in the runbook.

## Layout
- backend/   Spring Boot API, Maven project (`vn.techlead.roombook`, packages by feature)
- frontend/  Vue 3 + Vite + TypeScript + Pinia, unit tests with Vitest (`*.spec.ts` next to the code)
- e2e/       Playwright tests (config: playwright.config.ts at the root)
- mvnw, .mvn/  Maven wrapper (use from the repo root with `-f backend/pom.xml`)
- project-context/  business, architecture, conventions, design, runbook
- specs/     per-issue specs, plans, test cases, QA reports

## Commands
See project-context/runbook.md. Quick:
- `make install` — Maven dependencies + `npm ci` (root and frontend)
- `make lint` — backend compile + frontend `vue-tsc --noEmit`
- `make test` — backend tests, then frontend unit tests
- `make e2e` — Playwright (starts backend and frontend itself)
- One backend test class: `./mvnw -f backend/pom.xml test -Dtest=AvailabilityControllerTest`
- One frontend spec: `npm test --prefix frontend -- src/utils/time.spec.ts`
- One e2e file: `npx playwright test e2e/rooms.spec.ts`
