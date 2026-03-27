<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Report;
use App\Models\TriageResult;
use App\Services\ReportFingerprintService;
use App\Services\ReportNormalizer;
use App\Services\ReportScoringService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class ProcessReportTriage implements ShouldQueue
{
    use Queueable;

    public function __construct(public Report $report)
    {
    }

    /**
     * Execute the triage job.
     *
     * This job is idempotent: if triage has already run, updateOrCreate will
     * leave existing TriageResult unchanged. This allows safe retries.
     *
     * Flow:
     * 1. Normalize report fields (trim, lowercase)
     * 2. Generate deterministic fingerprint
     * 3. Score the report (5-factor algorithm)
     * 4. Create/update TriageResult
     * 5. Update report status to 'triaged'
     */
    public function handle(): void
    {
        // Instantiate services
        $normalizer = new ReportNormalizer();
        $fingerprinter = new ReportFingerprintService();
        $scorer = new ReportScoringService();

        // Prepare data for processing
        $data = [
            'title'                      => $this->report->title,
            'vulnerability_type'         => $this->report->vulnerability_type,
            'reporter_severity_estimate' => $this->report->reporter_severity_estimate,
            'affected_area'              => $this->report->affected_area,
            'reproduction_steps'         => $this->report->reproduction_steps,
            'impact_description'         => $this->report->impact_description,
            'contact_email'              => $this->report->contact_email,
        ];

        // 1. Normalize
        $normalized = $normalizer->normalize($data);

        // 2. Fingerprint
        $fingerprint = $fingerprinter->generate($normalized);

        // 3. Score
        $scoreResult = $scorer->score($normalized);

        // 4. Create or update TriageResult (idempotent via updateOrCreate)
        TriageResult::updateOrCreate(
            ['report_id' => $this->report->id],
            [
                'priority_score'  => $scoreResult['priority_score'],
                'severity_bucket' => $scoreResult['severity_bucket'],
                'fingerprint'     => $fingerprint,
                'breakdown_json'  => $scoreResult['breakdown'],
            ]
        );

        // 5. Update report status
        $this->report->update([
            'status'     => 'triaged',
            'triaged_at' => now(),
        ]);
    }
}
