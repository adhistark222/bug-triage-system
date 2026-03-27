# React + Vite
# Frontend (React + Vite)

The SPA for the Bug Triage System, covering both the reporter submission flow and the authenticated reviewer workspace.

## Stack

- **React 19** + **Vite 8**
- **react-router-dom 7** — single-page routing
- **Vitest 4** + **React Testing Library 16** + **user-event 14** — test stack
- **jsdom 27** — DOM environment for tests

## Folder Structure

```text
src/
├── app/
│   ├── App.jsx              # Route table
│   ├── App.test.jsx         # Route-level tests
│   └── ProtectedRoute.jsx   # Auth guard + 5-min inactivity auto-logout
├── auth/
│   └── session.js           # getAuthToken / clearAuthToken (localStorage)
├── layouts/
│   └── AppLayout.jsx        # Shared page shell
├── pages/
│   ├── reporter/
│   │   └── ReportSubmitPage.jsx       # Reporter submission page
│   └── reviewer/
│       ├── ReviewerLoginPage.jsx      # Reviewer login + session notes
│       ├── ReviewerReportsPage.jsx    # Paginated queue list with filters
│       └── ReviewerReportDetailPage.jsx  # Full detail, score breakdown, disposition
├── components/
│   ├── reporter/
│   │   ├── ReportForm.jsx          # Full form with validation and submit
│   │   └── form/
│   │       ├── FieldRow.jsx        # Label + required indicator + error wrapper
│   │       ├── CharacterCount.jsx  # "x / 255" counter
│   │       └── FilePickerStatus.jsx  # File name + remove button
│   └── reviewer/
│       └── reviewerPresentation.js  # formatLabel, getSeverityTone, getVulnerabilityTone
├── api/
│   ├── reports.js               # submitReport() — FormData builder + fetch
│   ├── auth.js                  # loginReviewer, logoutReviewer
│   ├── reviewerReports.js       # fetchReviewerReports() — paginated queue
│   ├── reviewerReportDetail.js  # fetchReviewerReportDetail()
│   ├── reviewerAttachments.js   # fetchReviewerAttachmentUrl()
│   └── reviewerDisposition.js   # updateReviewerReportStatus() with override flag
├── test/
│   └── setup.js            # jest-dom/vitest import
└── index.css               # Design system (CSS variables, reviewer UI styles, pagination)
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

All requests go through the modules in `src/api/`. The Vite dev server proxies `/api/*` to `VITE_API_TARGET`, so no CORS configuration is needed in development.

Reporter submissions use `multipart/form-data` (required for file attachments). Reviewer API calls use `application/json` with a Sanctum bearer token stored in `localStorage`.

All API modules return a discriminated union:

```js
// success
{ ok: true, data: { ... } }

// validation error (422)
{ ok: false, type: 'validation', fieldErrors: { field: 'message', ... } }

// auth error (401)
{ ok: false, type: 'auth', message: '...' }

// network / server error
{ ok: false, type: 'network' | 'server', message: '...' }
```

## Reviewer Pagination

The queue page (`ReviewerReportsPage`) supports full server-side pagination:

- A **per-page selector** lets the reviewer choose 10, 15, 25, or 50 rows at a time. Changing it resets to page 1.
- **Prev / Next buttons** and **numbered page buttons** are rendered from the `meta` block returned by the API (`current_page`, `last_page`, `from`, `to`, `total`).
- Changing any filter (status, severity, sort) also resets to page 1 so the reviewer always sees the top of the filtered result set.
- If the backend returns only one page, no pagination bar is shown — the UI stays clean.

## Session Security

`ProtectedRoute` wraps all reviewer routes. It sets a 5-minute inactivity timer on mount, listening to `pointerdown`, `pointermove`, `keydown`, `scroll`, and `touchstart` events to reset the clock. If the timer fires, the reviewer is logged out server-side and redirected to the login page. The login page displays a contextual warning banner when the redirect carries `reason: 'inactive-timeout'` in router state.

## Test Coverage (current)

| File | Tests |
|------|-------|
| App.test.jsx | 4 (routing and protected routes) |
| ProtectedRoute.test.jsx | 1 (inactivity auto-logout) |
| ReportForm.test.jsx | 14 (render, validation, UX depth, API integration) |
| ReviewerLoginPage.test.jsx | 2 (session note, timeout warning) |
| ReviewerLoginForm.test.jsx | 3 (login, errors) |
| ReviewerReportsPage.test.jsx | 9 (load, empty, error, filters, logout, pagination) |
| ReviewerReportDetailPage.test.jsx | 8 (load, navigation, logout, attachment, status, override) |
| reports.test.js | 4 |
| auth.test.js | 4 |
| reviewerReports.test.js | 3 |
| reviewerReportDetail.test.js | 2 |
| reviewerAttachments.test.js | 1 |
| reviewerDisposition.test.js | 2 |
| **Total** | **57** |

All tests follow TDD — behaviour is specified before implementation.
