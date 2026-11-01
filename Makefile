# Single-command entry points. See project-context/runbook.md.

WEB_PORT ?= 5201
API_PORT ?= 5202
export WEB_PORT API_PORT

MVNW := ./mvnw -f backend/pom.xml -B -ntp

.PHONY: install test e2e dev dev-backend dev-frontend lint reset-db

## install: download all dependencies (Maven, root npm, frontend npm)
install:
	$(MVNW) -q dependency:go-offline test-compile
	npm ci
	npm ci --prefix frontend

## test: backend tests (JUnit), then frontend unit tests (Vitest)
test:
	$(MVNW) test
	npm test --prefix frontend

## e2e: Playwright tests; starts backend and frontend on API_PORT and WEB_PORT
e2e:
	npx playwright test

## dev: run backend and frontend together (Ctrl+C stops both)
dev:
	$(MAKE) -j2 dev-backend dev-frontend

dev-backend:
	$(MVNW) spring-boot:run

dev-frontend:
	npm run dev --prefix frontend

## lint: compile the backend, type-check the frontend
lint:
	$(MVNW) -q compile
	npm run lint --prefix frontend

## reset-db: delete the local H2 database (recreated by Flyway on next start)
reset-db:
	rm -rf backend/data
