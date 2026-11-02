# Coding conventions

## General
- English for code, comments, docs and UI text.
- Small focused files; names say what a thing is (`AvailabilityService`, `RoomTimeline.vue`).
- No dead code, no commented-out code, no TODOs without an issue key.
- Do not add dependencies without a reason stated in the plan; record notable ones as an ADR in `architecture/decisions/`.

## Backend (Java 17, Spring Boot 4)

### Structure
- Package by feature under `vn.techlead.roombook`: `user/`, `room/`, `booking/`, `availability/`; cross-cutting code in `common/`. A new feature gets its own package with its controller, service, repository, entities and DTOs.
- Controller → service → repository. Controllers: bind/validate input, call one service method, return the result. Services: business logic, `@Transactional` (class-level `readOnly = true`, method-level `@Transactional` for writes), return DTO records. Repositories: Spring Data `JpaRepository` interfaces; derived queries or JPQL `@Query`.
- Entities never leave the service layer and are never serialized.
- Constructor injection only (no `@Autowired` fields in main code); one constructor, fields `private final`.
- 4-space indentation; imports grouped `java.*`, `jakarta.*`, `org.*`, then `vn.techlead.*`; no wildcard imports.

### DTOs and JSON
- Request and response bodies are Java `record`s named `<Thing>Request` / `<Thing>Response`, with a static `from(Entity)` factory for responses.
- Record components are camelCase in Java; the global Jackson `SNAKE_CASE` strategy turns them into snake_case JSON. Never use `@JsonProperty` to rename.
- Lists are returned as plain JSON arrays; collections are never `null` (use `List.of()`).

### Validation
- Bean Validation annotations on request records (`@NotBlank`, `@Size(max = 100)`, `@NotNull`, `@Positive`), `@Valid @RequestBody` in the controller. Field errors become `400` with an `errors` array (see api.md).
- Query parameters: typed (`LocalDate`, `Long`, enums) with `@DateTimeFormat(iso = DateTimeFormat.ISO.DATE)` for dates. Wrong types become `400` automatically.
- Business rules that need data (overlaps, limits) are checked in the service.

### Errors (ProblemDetail)
- Never return error bodies by hand and never catch-and-log-and-continue. Throw, and let `common/ApiExceptionHandler` produce the `ProblemDetail`.
- For business errors throw `org.springframework.web.ErrorResponseException` (or a subclass in the feature package) with the right status and a user-readable `detail`; the base handler renders it:

```java
ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, "Ha Long is already booked from 09:00 to 10:00.");
problem.setTitle("Room not available");
throw new ErrorResponseException(HttpStatus.CONFLICT, problem, null);
```
- Status codes: `400` invalid input, `401` missing/unknown `X-User-Id`, `403` not allowed for this role, `404` unknown id, `409` conflict with existing data, `422` well-formed request that breaks a business rule.
- `detail` texts are shown to users as-is: one or two plain sentences, times in office time ("09:00"), no stack traces or class names.

### Time handling (see ADR-0001)
- `Instant` for every point in time (entities, DTOs, JSON). `LocalDate` only for calendar dates in the office time zone. No `LocalDateTime`, `Date` or `Timestamp`.
- Office zone: inject `OfficeProperties` and use `office.timeZone()`; never hard-code `Asia/Ho_Chi_Minh` in Java.
- Office day → UTC range: `date.atStartOfDay(zone).toInstant()` to `date.plusDays(1).atStartOfDay(zone).toInstant()`.
- "Now": inject `Clock` (`clock.instant()`, `LocalDate.now(clock.withZone(zone))`).
- 15-minute steps: check in the office zone, e.g. `instant.atZone(zone).getMinute() % 15 == 0` and zero seconds/nanos.
- Interval overlap: `a.start < b.end && a.end > b.start`.

### Persistence
- Schema only via Flyway: new file `V<next>__<snake_case_description>.sql`; never edit a merged migration. Keep `ddl-auto=validate` passing (column types must match the entity mapping).
- Enums stored as strings (`@Enumerated(EnumType.STRING)`); time columns `TIMESTAMP(6) WITH TIME ZONE`.
- Associations `@ManyToOne(fetch = LAZY)`; access them inside the service transaction (`open-in-view` is off).
- Reference data that every environment needs goes in a migration; sample data does not.

## Frontend (Vue 3, TypeScript, Pinia)

### Structure
- `src/pages/` one component per screen (`<Name>Page.vue`), `src/components/` reusable pieces, `src/api/` HTTP, `src/stores/` Pinia, `src/utils/` pure functions, `src/config.ts` constants.
- Single-file components with `<script setup lang="ts">`, then `<template>`, then `<style scoped>`.
- Import with the `@/` alias (`@/api/rooms`), not long relative paths.
- Two-space indentation, single quotes, no semicolons (match existing files).
- When the header navigation shown in the mockups is added (RMB-3), add `vue-router@4` with routes in `src/router/index.ts` and render `<RouterView />` in `App.vue`. Until then `App.vue` switches between the room list and the booking form with a `view` ref.

### TypeScript
- `strict` mode; no `any` (use `unknown` and narrow). `vue-tsc --noEmit` must pass (`make lint`).
- Props with `defineProps<{ ... }>()`, events with `defineEmits<{ ... }>()`.
- API types in `src/api/types.ts` mirror the JSON exactly (snake_case fields, date-times as `string`).

### API access
- Only `src/api/*` calls `fetch`, through `apiRequest`/`apiGet` in `src/api/http.ts`. One exported function per endpoint (`fetchRooms`, `fetchAvailability(date)`), returning typed data.
- Errors arrive as `ApiError`; show `error.detail` to the user (it comes from the ProblemDetail). Field errors are in `error.problem?.errors`.
- `X-User-Id` is added by `http.ts` from the user store; do not add it by hand.

### State
- Pinia setup stores (`defineStore('name', () => { ... })`) only for state shared across pages (today: acting user in `stores/user.ts`). Page data (lists, forms) lives in the page with `ref`/`computed` and is loaded in `onMounted`.
- Each page handles loading, error and empty states as in the mockups.

### Time and display
- Never parse or build date-time strings by hand. Use `src/utils/time.ts`: `formatOfficeTime`, `formatOfficeTimeRange`, `formatCalendarDate`, `toOfficeDate`, `minutesFromOfficeMidnight`. Add new conversions there, with tests.
- Times in 24-hour `HH:mm` office time; dates as "Mon 2 Nov 2026" (BR-5). Equipment labels from `src/utils/equipment.ts`.

### Styling and accessibility
- Use the design tokens (`var(--color-…)`, `var(--space-…)`) from `project-context/design/tokens.css`; no raw colours or pixel spacing outside the tokens. New tokens go into `tokens.css` (shared with the mockups).
- Follow the matching mockup in `project-context/design/screens/`.
- Every input has a `<label>`; buttons are `<button>`; error messages use `role="alert"`, success messages `role="status"`.
- `data-testid` only where no role/label locator works (e.g. `room-card`).
