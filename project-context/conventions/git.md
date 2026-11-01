# Git conventions

- Base branch: `develop` (protected: changes only through pull requests with one approval; no direct or force pushes).
- Branches: `spec/<KEY>` (specification), `feat/<KEY>` (story or task), `fix/<KEY>` (bug), where `<KEY>` is the issue key, e.g. `feat/RMB-42`.
- Commit messages: `<KEY>: <imperative summary>`, lower-case after the colon, no trailing period, e.g. `RMB-42: add booking endpoint`. QA commits: `<KEY>: QA run <n> — <pass|fail>`.
- Pull request titles: `<KEY>: <summary>` for code, `<KEY>: Spec — <summary>` for specs.
- One issue per branch and pull request. Code, tests and the matching project-context updates go in the same pull request.
- Never commit `node_modules/`, `backend/target/`, `backend/data/`, Playwright output, `.env` files or IDE settings (see `.gitignore`).
- Keep lockfiles (`package-lock.json`, `frontend/package-lock.json`) in sync: change dependencies with `npm install`, commit the lockfile.
