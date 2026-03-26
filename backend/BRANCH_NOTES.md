# Branch Notes (feat/triage-foundation)

This note explains what changed in this branch and why.

## Problem We Solved

Build a secure, test-driven API for vulnerability report intake, automated triage, and reviewer disposition.

## What Changed by Folder

## app/Http/Controllers/Api/V1

- AuthController
  - Login returns Sanctum token
  - Logout revokes current token and clears guard/session state
- PublicReportController
  - Accepts report submissions and queues triage job
- ReviewerReportController
  - List/filter/sort reports
  - Show report detail with triage result
  - Apply final disposition status transitions
  - Download attachments from private storage

Why:
- Keep endpoint orchestration in thin controllers
- Keep auth and reviewer operations explicit and testable

## app/Http/Requests/Api/V1

- StoreReportRequest
  - Validates report payload and attachments
- UpdateReportStatusRequest
  - Enforces allowed final statuses

Why:
- Validation belongs in Form Requests for consistency and reuse

## app/Http/Resources/Api/V1

- ReportResource
- TriageResultResource

Why:
- Stable response contracts and controlled JSON exposure

## app/Jobs

- ProcessReportTriage
  - Normalizes report data
  - Generates deterministic fingerprint
  - Computes score and severity bucket
  - Persists triage result and updates report state

Why:
- Move heavy work out of request cycle and keep submission endpoint fast

## app/Services

- ReportNormalizer
- ReportFingerprintService
- ReportScoringService

Why:
- Deterministic, unit-testable business logic
- Easier to reason about and modify than controller-embedded logic

## routes

- routes/api.php delegates v1 routes
- routes/api/v1.php defines public and auth:sanctum reviewer endpoints

Why:
- Versioned route design from day one

## tests/Feature/Api/V1

- ReportSubmissionTest
- ReviewerDispositionTest

Why:
- Verify end-to-end behavior for public and reviewer workflows

## tests/Unit/Services

- ReportScoringServiceTest
- ReportFingerprintServiceTest

Why:
- Lock deterministic service behavior and prevent algorithm drift

## database/factories

- ReportFactory
- TriageResultFactory

Why:
- Repeatable realistic test data

## config

- sanctum.php tuned for auth behavior under current flow

Why:
- Ensure token-based reviewer API flow and predictable test behavior

## How to Demonstrate This Branch Quickly

1. Run full tests and show all green.
2. Submit a report via API and show reports row in DB.
3. Show triage result row appears and report status moves to triaged.
4. Login as reviewer, list and inspect report.
5. Disposition report and show reviewed_at change in DB.
6. Logout and verify token no longer authorizes protected route.


