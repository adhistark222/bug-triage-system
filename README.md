# Bug Triage System

Monorepo for a bug triage platform with:

- `backend/`: Laravel API
- `frontend/`: React (Vite)
- Docker-based local development

## Current Status

- Backend containerized and running
- PostgreSQL connected
- Base Laravel migrations working
- Frontend container service added in docker compose

## Project Structure

```text
bug-triage-system/
├── backend/            # Laravel app
├── frontend/           # React app (Vite)
├── docker-compose.yml  # App, frontend, postgres services
└── .env                # Docker compose environment variables
```

## Run the Project

From repo root:

```bash
docker compose up --build
```

Services:

- Laravel backend: http://localhost:8000
- Vite frontend: http://localhost:5173
- PostgreSQL: localhost:5432

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
