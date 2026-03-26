# Backend (Laravel API)

This folder contains the Laravel backend for the Bug Bounty / Security Report Triage System.

The API is designed to be:
- Deterministic (same input gives same triage output)
- Secure by default (private file storage, strict validation, token auth)
- Clearly reasoned (every decision has a documented rationale)

## Stack

- Laravel 13
- PHP 8.4 (Docker)
- PostgreSQL 15
- Laravel Sanctum for token auth
- Laravel queue jobs (database-backed)

## Current Status

- Test suite: 71 passed
- Unit tests lock scoring and fingerprint behavior
- Feature tests cover submission, auth, reviewer workflows, and attachment download

## High-Level Architecture

### Request Flow

1. Public reporter submits vulnerability report
2. Request validation sanitizes and rejects invalid input
3. Report is stored with status = submitted
4. Optional attachment is stored on local private disk
5. Background job computes fingerprint + score + severity bucket
6. Triage result is written and report status becomes triaged
7. Reviewer logs in, inspects triaged reports, and sets final disposition

### Main Components by Folder

- app/Http/Controllers/Api/V1
	- PublicReportController: public report submission
	- AuthController: reviewer login/logout and token lifecycle
	- ReviewerReportController: listing, detail, status transitions, downloads
- app/Http/Requests/Api/V1
	- StoreReportRequest: submission validation rules
	- UpdateReportStatusRequest: controlled status transition rules
- app/Http/Resources/Api/V1
	- ReportResource and TriageResultResource: API response shape
- app/Jobs
	- ProcessReportTriage: async triage computation and persistence
- app/Services
	- ReportNormalizer, ReportFingerprintService, ReportScoringService
- tests/Feature/Api/V1
	- End-to-end API behavior tests
- tests/Unit/Services
	- Deterministic service tests

## Key Decisions and Why

### 1) UUIDs Instead of Increment IDs

Why:
- Reduces ID enumeration risk
- Better for public-facing object identifiers

### 2) Versioned API Routes (/api/v1)

Why:
- Enables non-breaking v2 expansion later
- Keeps route contracts explicit for frontend and integrators

### 3) Queue-Based Triage

Why:
- Submission endpoint stays fast
- Scoring logic can evolve independently
- Retry-safe implementation with idempotent update behavior

### 4) Private Attachment Storage

Why:
- Uploaded evidence is sensitive
- Files are never directly public
- Download is controlled through authenticated endpoint

### 5) Deterministic Scoring + Fingerprinting

Why:
- Reviewers need stable prioritization, not random behavior
- Deterministic fingerprint supports duplicate detection and analytics

### 6) Strict Status Transition Rules

Why:
- Prevents invalid workflow states
- Keeps triage lifecycle auditable

## Important Fixes Made During Phase 3

- Fixed a parse error in StoreReportRequest caused by a stray use statement inside rules
- Repaired severity validation rule that was accidentally truncated
- Updated email validation from email:rfc,dns to email:rfc for test-domain compatibility
- Replaced attachment download implementation to satisfy static analysis and proper response typing
- Replaced storage assertion helpers in tests with explicit exists checks for Intelephense compatibility
- Hardened logout flow:
	- Revokes current personal access token
	- Clears web guard/session state
	- Forgets resolved auth guards to prevent stale in-memory auth state in test cycle

## API Endpoints

Public:
- POST /api/v1/reports
- POST /api/v1/auth/login

Authenticated reviewer:
- POST /api/v1/auth/logout
- GET /api/v1/reviewer/reports
- GET /api/v1/reviewer/reports/{report}
- PATCH /api/v1/reviewer/reports/{report}/status
- GET /api/v1/reviewer/reports/{report}/attachment

## How To Test the API End-to-End

Run from repository root:

1) Start services
docker compose up -d

2) Fresh database and seed
docker compose exec -T app php artisan migrate:fresh --seed

3) Run tests
docker compose exec -T app php artisan test --no-progress

4) Manual API flow with curl or Postman

Step A: Submit report
- POST /api/v1/reports with JSON body:
	- title
	- vulnerability_type
	- reporter_severity_estimate
	- affected_area
	- reproduction_steps
	- impact_description
	- contact_email

Step B: Login reviewer
- POST /api/v1/auth/login
- Save token from response

Step C: List reports
- GET /api/v1/reviewer/reports with Authorization: Bearer token

Step D: View details
- GET /api/v1/reviewer/reports/{id}

Step E: Disposition
- PATCH /api/v1/reviewer/reports/{id}/status with one of:
	- accepted
	- rejected
	- needs_more_info

Step F: Logout
- POST /api/v1/auth/logout with Authorization: Bearer token

Step G: Verify token revoked
- Repeat GET /api/v1/reviewer/reports with same token
- Expected: 401

## DBeaver: What To Observe While Testing

Open these tables side-by-side:
- reports
- triage_results
- personal_access_tokens

### Observation Checklist by API Step

After Step A (submit report):
- reports has a new row
- status = submitted
- triaged_at is null
- reviewed_at is null
- attachment metadata fields set only if file uploaded

After queue job processes:
- triage_results has one row linked by report_id
- priority_score and severity_bucket are populated
- fingerprint is 64-char sha256
- reports.status changes to triaged
- reports.triaged_at is populated

After Step E (disposition):
- reports.status becomes accepted/rejected/needs_more_info
- reports.reviewed_at is populated
- no second triage_result row created

After Step F (logout):
- corresponding row in personal_access_tokens is removed

After Step G (retry with old token):
- API returns 401

## Suggested SQL Snippets for DBeaver

Latest reports:
select id, status, vulnerability_type, triaged_at, reviewed_at, created_at
from reports
order by created_at desc
limit 20;

Triage join view:
select r.id, r.status, t.priority_score, t.severity_bucket, t.fingerprint
from reports r
left join triage_results t on t.report_id = r.id
order by r.created_at desc
limit 20;

Token presence:
select id, tokenable_id, name, created_at
from personal_access_tokens
order by created_at desc;

## Local Development Commands

From project root:

- Start stack
	- docker compose up --build

- Install backend dependencies inside container
	- docker compose exec -T app composer install

- Run migrations
	- docker compose exec -T app php artisan migrate

- Run tests
	- docker compose exec -T app php artisan test

- Queue worker (if you want real async processing during manual testing)
	- docker compose exec -T app php artisan queue:work
