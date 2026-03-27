# Bug Triage System

## Description

A small internal security report triage system demonstrating realistic full-stack architecture in a constrained scope. Reporters submit structured vulnerability reports through a React frontend. Laravel validates and stores submissions, securely handles optional attachments, and dispatches an asynchronous triage job so intake remains fast.

Triage uses deterministic scoring logic to assign a priority score and severity bucket, helping reviewers sort reports consistently. Reviewers authenticate, inspect the paginated queue, view score breakdowns, download evidence attachments, and set a final disposition (accept / reject / needs more info). The design avoids unnecessary service boundaries so the architecture stays coherent and maintainable.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 8 + react-router-dom 7 |
| Backend | Laravel 13, PHP 8.4 |
| Database | PostgreSQL 15 |
| Auth | Laravel Sanctum (token) |
| Queue | Laravel jobs, database-backed |
| Dev env | Docker Compose |

## Current Status

| Area | Status |
|------|--------|
| Backend | ✅ Complete — 74 tests, 196 assertions |
| Reporter UI | ✅ Complete — submission flow with validation |
| Reviewer UI | ✅ Complete — queue, pagination, detail, disposition, session guard |
| Queue worker | ✅ Running as separate compose service |

## Project Structure

```text
bug-triage-system/
├── backend/            # Laravel API (see backend/README.md)
├── frontend/           # React + Vite SPA (see frontend/README.md)
├── docker-compose.yml  # app, frontend, postgres, worker services
└── .env                # Docker Compose secrets (not committed)
```

## Running the Project

```bash
# Build and start all services
docker compose up --build

# Or start in background
docker compose up -d --build
```

| Service | URL |
|---------|-----|
| React frontend | http://localhost:5173 |
| Laravel backend | http://localhost:8000 |
| PostgreSQL | localhost:5432 |

The `worker` service starts automatically alongside the others and processes the triage queue in the background.

## Running Tests

```bash
# Backend (PHP) — 74 tests
docker compose exec app php artisan test

# Frontend (Vitest) — 57 tests
docker compose exec frontend npm test -- --run
```

## Seeding Demo Data

```bash
# Fresh database with seed (20 users, 60 reports, triage results)
docker compose exec app php artisan migrate:fresh --seed
```

The default reviewer credential created by the seeder is set in `database/seeders/DatabaseSeeder.php`. Check that file for the login email/password.

## Reviewer Workflow

1. Open http://localhost:5173/reviewer/login and sign in
2. The queue page shows all reports, sorted by priority score descending
3. Use the filters (status, severity) and sort controls to narrow the view
4. Choose how many entries to show per page (10 / 15 / 25 / 50) and navigate pages
5. Click any report card to open the detail view
6. Review the triage score breakdown, narrative, and optional attachment
7. Set a disposition — accepted, rejected, or needs more info
8. Use the override toggle to re-disposition already-reviewed reports
9. Sessions auto sign out after 5 minutes of inactivity

## Environment Variables

The project root `.env` is used by Docker Compose only (credentials, ports).  
The frontend reads `frontend/.env` at build time. Copy the example file to get started:

```bash
cp frontend/.env.example frontend/.env
```

See `frontend/.env.example` for available variables.

## Branch Flow

This repository follows a staged promotion flow:

1. Create or update a feature branch (example: `feat/backend-setup`)
2. Merge feature branch into `staging`
3. Validate on `staging`
4. Merge `staging` into `main`

## Git Flow Commands

```bash
# create feature branch
git checkout -b feat/some-work

# after committing feature work
git checkout staging
git merge --no-ff feat/some-work

git checkout main
git merge --no-ff staging
```

## Notes

- Keep secrets in `.env` files and do not commit them.
- Use the project root `.gitignore` to avoid committing runtime artifacts.
