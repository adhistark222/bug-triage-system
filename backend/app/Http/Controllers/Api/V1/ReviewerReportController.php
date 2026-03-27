<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\UpdateReportStatusRequest;
use App\Http\Resources\Api\V1\ReportResource;
use App\Models\Report;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReviewerReportController extends Controller
{
    /**
     * List all reports with optional filtering and sorting.
     *
     * Query parameters:
     * - status: submitted|triaged|accepted|rejected|needs_more_info
     * - vulnerability_type: sql_injection|xss|etc
     * - severity_bucket: low|medium|high|critical
     * - sort_by: priority_score|created_at (default: created_at)
     * - sort_dir: asc|desc (default: desc)
     *
     * @return AnonymousResourceCollection { data: ReportResource[], meta: { total, per_page, current_page } }
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        // Validate and extract filter parameters
        $filters = $request->validate([
            'status'             => 'nullable|string|in:submitted,triaged,accepted,rejected,needs_more_info',
            'vulnerability_type' => 'nullable|string',
            'severity_bucket'    => 'nullable|string|in:low,medium,high,critical',
            'sort_by'            => 'nullable|string|in:priority_score,created_at',
            'sort_dir'           => 'nullable|string|in:asc,desc',
            'per_page'           => 'nullable|integer|in:10,15,25,50',
        ]);

        // Build query with eager loading of triageResult
        $query = Report::with('triageResult');

        // Apply filters
        if ($filters['status'] ?? null) {
            $query->where('status', $filters['status']);
        }

        if ($filters['vulnerability_type'] ?? null) {
            $query->where('vulnerability_type', $filters['vulnerability_type']);
        }

        if ($filters['severity_bucket'] ?? null) {
            // Severity bucket is in the triage_results table, so join
            $query->whereHas('triageResult', fn ($q) =>
                $q->where('severity_bucket', $filters['severity_bucket'])
            );
        }

        // Apply sorting
        $sortBy = $filters['sort_by'] ?? 'created_at';
        $sortDir = $filters['sort_dir'] ?? 'desc';

        if ($sortBy === 'priority_score') {
            // Join and sort by triage score
            $query->leftJoin('triage_results', 'reports.id', '=', 'triage_results.report_id')
                  ->orderBy('triage_results.priority_score', $sortDir)
                  ->select('reports.*');
        } else {
            // Sort by created_at
            $query->orderBy('created_at', $sortDir);
        }

        // Paginate — caller may request 10, 15, 25, or 50 per page; default 15
        $perPage = (int) ($filters['per_page'] ?? 15);
        $reports = $query->paginate($perPage);

        return ReportResource::collection($reports);
    }

    /**
     * Show a specific report with its triage result.
     *
     * @return JsonResponse { data: ReportResource }
     */
    public function show(Report $report): JsonResponse
    {
        return response()->json(
            ['data' => ReportResource::make($report->load('triageResult'))],
            200
        );
    }

    /**
     * Update a report's status (disposition).
     *
     * Only allowed:
     * - If current status is 'triaged'
     * - Target status is one of: accepted, rejected, needs_more_info
     *
     * @return JsonResponse { data: ReportResource }
     *
     * @throws ValidationException if transition is invalid
     */
    public function updateStatus(Report $report, UpdateReportStatusRequest $request): JsonResponse
    {
        $override = (bool) ($request->validated()['override'] ?? false);

        if ($report->status === 'submitted') {
            throw ValidationException::withMessages([
                'status' => 'Submitted reports must be triaged before a reviewer can set a disposition.',
            ]);
        }

        // Validate that the report can be dispositioned
        if (! $override && ! $report->canBeDispositioned()) {
            throw ValidationException::withMessages([
                'status' => 'Report must be in triaged status to set a final disposition.',
            ]);
        }

        // Validate that we're not re-dispositioning an already dispositioned report
        if (! $override && $report->isDispositioned()) {
            throw ValidationException::withMessages([
                'status' => 'Report has already been dispositioned and cannot be changed.',
            ]);
        }

        // Update status and reviewed_at timestamp
        $report->update([
            'status'      => $request->validated()['status'],
            'reviewed_at' => now(),
        ]);

        return response()->json(
            ['data' => ReportResource::make($report)],
            200
        );
    }

    /**
     * Download an attachment from a report.
     *
     * The file is streamed as an attachment (never inline) to prevent security issues.
     *
    * @return StreamedResponse|BinaryFileResponse|JsonResponse
     */
    public function downloadAttachment(Report $report): StreamedResponse|BinaryFileResponse|JsonResponse
    {
        // Report must have an attachment
        if (! $report->hasAttachment()) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        // Stream from private storage.
        return response()->download(
            Storage::disk('local')->path($report->attachment_storage_path),
            $report->attachment_original_name,
            ['Content-Type' => $report->attachment_mime]
        );
    }
}
