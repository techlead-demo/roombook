# RoomBook

Meeting-room booking for a small office: see which rooms are free today, and (soon) book them.

- `backend/` — Java 17, Spring Boot 4, Spring Data JPA, H2 + Flyway
- `frontend/` — Vue 3, Vite, TypeScript, Pinia
- `e2e/` — Playwright

## Quick start

Requires JDK 17 (`JAVA_HOME` pointing to it) and Node.js 24.

```sh
make install   # dependencies
make dev       # API on :5202, web app on http://localhost:5201
make test      # backend + frontend unit tests
make e2e       # Playwright (first time: npx playwright install chromium)
```

Ports come from `API_PORT` and `WEB_PORT`. Details: [project-context/runbook.md](project-context/runbook.md).
Contributor guide: [CLAUDE.md](CLAUDE.md) and [project-context/](project-context/).
