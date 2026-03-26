<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreReportRequest;
use App\Jobs\ProcessReportTriage;
use App\Models\Report;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class PublicReportController extends Controller
{
    /**
     * Store a new security report.
     *
     * Validates the submission, stores the report in the database,
     * handles attachment storage, and dispatches a triage job.
     *
     * @return JsonResponse { data: { id: string, status: string, message: string } }
     */
    public function store(StoreReportRequest $request): JsonResponse
    {
        // Extract validated data
        $validated = $request->validated();

        // Prepare report fields (attachment is separate)
        $reportData = [
            'title'                      => $validated['title'],
            'vulnerability_type'         => $validated['vulnerability_type'],
            'reporter_severity_estimate' => $validated['reporter_severity_estimate'],
            'affected_area'              => $validated['affected_area'],
            'reproduction_steps'         => $validated['reproduction_steps'],
            'impact_description'         => $validated['impact_description'],
            'contact_email'              => $validated['contact_email'],
            'status'                     => 'submitted',
        ];

        // Handle optional attachment
        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');

            // Generate a unique filename (UUID-based) to prevent path traversal and tampering
            $filename = \Illuminate\Support\Str::uuid() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('reports', $filename, 'local');

            // Store attachment metadata (not the raw file path in the response)
            $reportData['attachment_original_name'] = $file->getClientOriginalName();
            $reportData['attachment_storage_path']  = $path;
            $reportData['attachment_mime']          = $file->getMimeType();
            $reportData['attachment_size_bytes']    = $file->getSize();
        }

        // Create and persist the report
        $report = Report::create($reportData);

        // Dispatch the triage job (will run asynchronously)
        ProcessReportTriage::dispatch($report);

        return response()->json(
            [
                'data' => [
                    'id'      => $report->id,
                    'status'  => $report->status,
                    'message' => 'Your security report has been received and is being processed.',
                ],
            ],
            201
        );
    }
}
