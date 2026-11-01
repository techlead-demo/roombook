# ADR-0001 Store and transfer time in UTC; office time zone only at the edges

Status: accepted

## Context
Bookings are points on a timeline, but people think in office wall-clock time (Asia/Ho_Chi_Minh) and calendar days. Mixing local and UTC values causes off-by-hours and wrong-day bugs, especially around midnight.

## Decision
- Entities, DTOs and JSON use `Instant` (ISO 8601 with `Z`). Database columns are `TIMESTAMP(6) WITH TIME ZONE`; Hibernate's JDBC time zone and the JVM default time zone are UTC.
- A calendar date in the API (`LocalDate`, `YYYY-MM-DD`) is a day in the office time zone. It is converted to a UTC range with `date.atStartOfDay(zone)` and `date.plusDays(1).atStartOfDay(zone)`.
- The office time zone is the configuration property `roombook.office.time-zone` (`OfficeProperties`); the web app mirrors it in `src/config.ts` and formats times with `src/utils/time.ts` (`Intl`).
- "Now" comes from an injected `Clock` (UTC).

## Consequences
- No `LocalDateTime` anywhere in the domain or API.
- Tests assert exact UTC strings and cover day boundaries (00:00 office time = 17:00 UTC the previous day).
