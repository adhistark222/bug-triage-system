<?php

declare(strict_types=1);

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\PublicReportController;
use App\Http\Controllers\Api\V1\ReviewerReportController;
use Illuminate\Support\Facades\Route;

// =========================================================================
// PUBLIC ENDPOINTS (no authentication required)
// =========================================================================

// Report submission endpoint
Route::post('/reports', PublicReportController::class.'@store');

// Reviewer authentication
Route::post('/auth/login', AuthController::class.'@login');

// =========================================================================
// REVIEWER-ONLY ENDPOINTS (Sanctum token authentication required)
// =========================================================================

Route::middleware('auth:sanctum')->group(function () {
    // Logout endpoint
    Route::post('/auth/logout', AuthController::class.'@logout');

    // Reviewer dashboard: list all reports with filters and sorting
    Route::get('/reviewer/reports', ReviewerReportController::class.'@index');

    // Report detail: see full submission + triage result
    Route::get('/reviewer/reports/{report}', ReviewerReportController::class.'@show');

    // Change report status: only triaged → accepted|rejected|needs_more_info
    Route::patch('/reviewer/reports/{report}/status', ReviewerReportController::class.'@updateStatus');

    // Download attachment (if report has one)
    Route::get('/reviewer/reports/{report}/attachment', ReviewerReportController::class.'@downloadAttachment');
});
