<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Jobs\ProcessReportTriage;
use App\Models\Report;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ReportSubmissionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Prevent the sync queue from running the job during submission tests.
        // Job dispatch is asserted separately; side effects are tested in the job suite.
        Queue::fake();
        Storage::fake('local');
    }

    // -------------------------------------------------------------------------
    // Success cases
    // -------------------------------------------------------------------------

    public function test_valid_report_without_attachment_is_accepted(): void
    {
        $response = $this->postJson('/api/v1/reports', $this->validPayload());

        $response->assertStatus(201)
                 ->assertJsonStructure([
                     'data' => ['id', 'status', 'message'],
                 ])
                 ->assertJsonPath('data.status', 'submitted');
    }

    public function test_valid_report_with_valid_attachment_is_accepted(): void
    {
        $payload = $this->validPayload();
        $payload['attachment'] = UploadedFile::fake()->create('evidence.pdf', 512, 'application/pdf');

        $response = $this->postJson('/api/v1/reports', $payload);

        $response->assertStatus(201);
    }

    public function test_report_is_persisted_with_correct_fields(): void
    {
        $payload = $this->validPayload();
        $this->postJson('/api/v1/reports', $payload);

        $this->assertDatabaseHas('reports', [
            'title'                     => $payload['title'],
            'vulnerability_type'        => $payload['vulnerability_type'],
            'reporter_severity_estimate' => $payload['reporter_severity_estimate'],
            'affected_area'             => $payload['affected_area'],
            'contact_email'             => $payload['contact_email'],
            'status'                    => 'submitted',
        ]);
    }

    public function test_initial_status_is_submitted(): void
    {
        $this->postJson('/api/v1/reports', $this->validPayload());

        $report = Report::first();
        $this->assertSame('submitted', $report->status);
        $this->assertNull($report->triaged_at);
        $this->assertNull($report->reviewed_at);
    }

    public function test_triage_job_is_dispatched_after_submission(): void
    {
        $this->postJson('/api/v1/reports', $this->validPayload());

        Queue::assertPushed(ProcessReportTriage::class, 1);
    }

    public function test_triage_job_is_dispatched_with_the_new_report(): void
    {
        $this->postJson('/api/v1/reports', $this->validPayload());

        Queue::assertPushed(ProcessReportTriage::class, function (ProcessReportTriage $job): bool {
            $report = Report::first();
            return $job->report->is($report);
        });
    }

    public function test_attachment_is_stored_in_private_disk_not_public(): void
    {
        $payload = $this->validPayload();
        $payload['attachment'] = UploadedFile::fake()->create('evidence.txt', 100, 'text/plain');

        $this->postJson('/api/v1/reports', $payload);

        $report = Report::first();
        $this->assertNotNull($report->attachment_storage_path);

        $this->assertTrue(Storage::disk('local')->exists($report->attachment_storage_path));

        // Must never be on the public disk
        $this->assertFalse(Storage::disk('public')->exists($report->attachment_storage_path));
    }

    public function test_attachment_filename_is_generated_not_user_supplied(): void
    {
        $payload = $this->validPayload();
        $payload['attachment'] = UploadedFile::fake()->create('my-evidence.pdf', 100, 'application/pdf');

        $this->postJson('/api/v1/reports', $payload);

        $report = Report::first();
        $this->assertSame('my-evidence.pdf', $report->attachment_original_name);
        $this->assertStringNotContainsString('my-evidence', $report->attachment_storage_path);
    }

    public function test_attachment_metadata_is_persisted(): void
    {
        $file = UploadedFile::fake()->create('report.pdf', 256, 'application/pdf');
        $payload = $this->validPayload();
        $payload['attachment'] = $file;

        $this->postJson('/api/v1/reports', $payload);

        $this->assertDatabaseHas('reports', [
            'attachment_original_name' => 'report.pdf',
            'attachment_mime'          => 'application/pdf',
        ]);

        $report = Report::first();
        $this->assertNotNull($report->attachment_storage_path);
        $this->assertGreaterThan(0, $report->attachment_size_bytes);
    }

    public function test_submission_response_does_not_expose_storage_path(): void
    {
        $payload = $this->validPayload();
        $payload['attachment'] = UploadedFile::fake()->create('file.pdf', 100, 'application/pdf');

        $response = $this->postJson('/api/v1/reports', $payload);

        $response->assertJsonMissingPath('data.attachment_storage_path');
    }

    // -------------------------------------------------------------------------
    // Validation failure cases
    // -------------------------------------------------------------------------

    public function test_missing_required_fields_returns_422(): void
    {
        $response = $this->postJson('/api/v1/reports', []);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors([
                     'title',
                     'vulnerability_type',
                     'reporter_severity_estimate',
                     'affected_area',
                     'reproduction_steps',
                     'impact_description',
                     'contact_email',
                 ]);
    }

    public function test_invalid_vulnerability_type_returns_422(): void
    {
        $payload = $this->validPayload();
        $payload['vulnerability_type'] = 'zero_day_exploit'; // not in allowlist

        $this->postJson('/api/v1/reports', $payload)
             ->assertStatus(422)
             ->assertJsonValidationErrors(['vulnerability_type']);
    }

    public function test_invalid_severity_estimate_returns_422(): void
    {
        $payload = $this->validPayload();
        $payload['reporter_severity_estimate'] = 'catastrophic'; // not in allowlist

        $this->postJson('/api/v1/reports', $payload)
             ->assertStatus(422)
             ->assertJsonValidationErrors(['reporter_severity_estimate']);
    }

    public function test_invalid_contact_email_returns_422(): void
    {
        $payload = $this->validPayload();
        $payload['contact_email'] = 'not-an-email';

        $this->postJson('/api/v1/reports', $payload)
             ->assertStatus(422)
             ->assertJsonValidationErrors(['contact_email']);
    }

    public function test_disallowed_file_extension_returns_422(): void
    {
        $payload = $this->validPayload();
        $payload['attachment'] = UploadedFile::fake()->create('malware.exe', 100, 'application/octet-stream');

        $this->postJson('/api/v1/reports', $payload)
             ->assertStatus(422)
             ->assertJsonValidationErrors(['attachment']);
    }

    public function test_file_exceeding_size_limit_returns_422(): void
    {
        $payload = $this->validPayload();
        // Limit is 5MB (5120 KB). Create a 6MB file.
        $payload['attachment'] = UploadedFile::fake()->create('large.pdf', 6 * 1024, 'application/pdf');

        $this->postJson('/api/v1/reports', $payload)
             ->assertStatus(422)
             ->assertJsonValidationErrors(['attachment']);
    }

    public function test_disguised_file_with_disallowed_mime_type_returns_422(): void
    {
        $payload = $this->validPayload();
        // PDF extension, but actual MIME is PHP — classic disguised upload attack.
        $payload['attachment'] = UploadedFile::fake()->create('report.pdf', 100, 'application/x-php');

        $this->postJson('/api/v1/reports', $payload)
             ->assertStatus(422)
             ->assertJsonValidationErrors(['attachment']);
    }

    public function test_unauthenticated_user_cannot_access_reviewer_endpoints(): void
    {
        $this->getJson('/api/v1/reviewer/reports')
             ->assertStatus(401);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function validPayload(): array
    {
        return [
            'title'                      => 'SQL injection in login form bypasses authentication',
            'vulnerability_type'         => 'sql_injection',
            'reporter_severity_estimate' => 'high',
            'affected_area'              => 'user authentication endpoint',
            'reproduction_steps'         => str_repeat('Attempt SQL injection via the username field. ', 5),
            'impact_description'         => str_repeat('Allows full authentication bypass for any account. ', 3),
            'contact_email'              => 'researcher@example.com',
        ];
    }
}
