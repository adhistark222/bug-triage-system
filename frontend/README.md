# React + Vite
# Frontend (React + Vite)

The reporter-facing SPA for the Bug Triage System.

## Stack

- **React 19** + **Vite 8**
- **react-router-dom 7** — single-page routing
- **Vitest 4** + **React Testing Library 16** + **user-event 14** — test stack
- **jsdom 27** — DOM environment for tests

## Folder Structure

```text
src/
├── app/
│   ├── App.jsx             # Route table
│   └── App.test.jsx        # Route-level tests
├── layouts/
│   └── AppLayout.jsx       # Shared page shell
├── pages/
│   └── reporter/
│       └── ReportSubmitPage.jsx   # Reporter submission page
├── components/
│   └── reporter/
│       ├── ReportForm.jsx         # Full form — state, validation, submit
│       ├── ReportForm.test.jsx    # Component tests (colocated)
│       ├── SubmissionIntro.jsx    # Page header / intro copy
│       └── form/
│           ├── FieldRow.jsx       # Label + required indicator + error wrapper
│           ├── CharacterCount.jsx # "x / 255" counter
│           └── FilePickerStatus.jsx  # File name + remove button
├── api/
│   ├── reports.js          # submitReport() — FormData builder + fetch
│   └── reports.test.js     # Unit tests with mocked fetch
├── test/
│   └── setup.js            # jest-dom/vitest import
└── index.css               # Design system (CSS variables, card layout)
```

## Running Locally (Docker)

All commands should be run inside the container:

```bash
# Start the frontend service
docker compose up frontend

# Run tests (watch mode)
docker compose exec frontend npm test

# Run tests once (CI mode)
docker compose exec frontend npm test -- --run

# Build for production
docker compose exec frontend npm run build
```

## Environment Variables

Copy the example file before first run:

```bash
cp frontend/.env.example frontend/.env
```

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_API_TARGET` | `http://localhost:8000` | Backend URL for the Vite dev proxy |

In Docker Compose the `frontend` service overrides this to `http://app:8000` automatically via the environment block in `docker-compose.yml`.

## API Integration

All report submissions go through `src/api/reports.js`. The Vite dev server proxies `/api/*` to `VITE_API_TARGET`, so no CORS configuration is needed in development.

Form submissions use `multipart/form-data` (required for file attachments). The API module returns a discriminated union:

```js
// success
{ ok: true, data: { id, status, message } }

// validation error (422)
{ ok: false, type: 'validation', fieldErrors: { field: 'message', ... } }

// network / server error
{ ok: false, type: 'network' | 'server', message: '...' }
```

## Test Coverage (current)

| File | Tests |
|------|-------|
| App.test.jsx | 1 (routing) |
| ReportForm.test.jsx | 14 (render, validation, UX depth, API integration) |
| reports.test.js | 4 (API unit: success, 422, network, server error) |
| **Total** | **19** |

All tests follow TDD — tests were written before the corresponding implementation.
