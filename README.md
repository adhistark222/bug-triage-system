# Bug Triage System

## Description

A small internal security report triage system demonstrating realistic full-stack architecture in a constrained scope. Reporters submit structured vulnerability reports through a React frontend. Laravel validates and stores submissions, securely handles optional attachments, and dispatches an asynchronous triage job so intake remains fast.

Triage uses deterministic scoring logic to assign a priority score and severity bucket, helping reviewers sort reports consistently. The design avoids unnecessary service boundaries so the architecture stays coherent and maintainable.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 8 + react-router-dom 7 |
| Backend | Laravel 11, PHP 8.4 |
| Database | PostgreSQL 15 |
| Auth | Laravel Sanctum (token) |
| Queue | Laravel jobs, database-backed |
| Dev env | Docker Compose |

## Current Status

| Area | Status |
|------|--------|
| Backend | ✅ Complete — 71 tests passing |
| Frontend | 🚧 In progress — reporter submission flow done (19 tests passing) |
| Queue worker | ✅ Running as separate compose service |
| Reviewer UI | ⏳ Not started |

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

The `worker` service starts automatically alongside the others and processes the triage queue.

## Running Tests

```bash
# Backend (PHP)
docker compose exec app php artisan test

# Frontend (Vitest)
docker compose exec frontend npm test
```

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
