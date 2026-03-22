# Backend (Laravel API)

This folder contains the Laravel backend for the bug triage system.

## Stack

- Laravel 13
- PHP 8.4 (Docker)
- PostgreSQL 15 (Docker service at project root)

## Local Development (Docker)

Run these commands from the project root:

```bash
docker compose up --build
```

Backend will be available at:

- http://localhost:8000

## Database Setup

Make sure backend DB settings are set for PostgreSQL in `backend/.env`:

```env
DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=bug_triage
DB_USERNAME=postgres
DB_PASSWORD=postgres
```

Run migrations:

```bash
docker exec -it bug-triage-app php artisan migrate
```

## Useful Commands

```bash
# Install PHP dependencies inside container
docker exec -it bug-triage-app composer install

# Run Laravel tests
docker exec -it bug-triage-app php artisan test

# Open Laravel tinker
docker exec -it bug-triage-app php artisan tinker
```

## Notes

- Laravel source code is local in `backend/`.
- App execution and dependencies run in the `bug-triage-app` container.
- PostgreSQL data persists through the named Docker volume `postgres_data`.
