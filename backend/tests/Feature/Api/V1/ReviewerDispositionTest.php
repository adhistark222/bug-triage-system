<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Models\Report;
use App\Models\TriageResult;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ReviewerDispositionTest extends TestCase
{
    use RefreshDatabase;

    // -------------------------------------------------------------------------
    // Authentication
    // -------------------------------------------------------------------------

    public function test_unauthenticated_request_to_dashboard_returns_401(): void
    {
        $this->getJson('/api/v1/reviewer/reports')
             ->assertStatus(401);
    }

    public function test_unauthenticated_request_to_report_detail_returns_401(): void
    {
        $report = Report::factory()->create();

        $this->getJson("/api/v1/reviewer/reports/{$report->id}")
             ->assertStatus(401);
    }

    public function test_unauthenticated_request_to_status_update_returns_401(): void
    {
        $report = Report::factory()->create();

        $this->patchJson("/api/v1/reviewer/reports/{$report->id}/status", ['status' => 'accepted'])
             ->assertStatus(401);
    }

    public function test_reviewer_can_login_and_receive_token(): void
    {
        $reviewer = User::factory()->create(['password' => bcrypt('correct-horse-battery-staple')]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email'    => $reviewer->email,
            'password' => 'correct-horse-battery-staple',
        ]);

        $response->assertStatus(200)
                 ->assertJsonStructure(['data' => ['token']]);
    }

    public function test_invalid_credentials_return_401_with_generic_message(): void
    {
        User::factory()->create(['email' => 'reviewer@example.com']);

        $response = $this->postJson('/api/v1/auth/login', [
            'email'    => 'reviewer@example.com',
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(401)
                 ->assertJson(['message' => 'Invalid credentials.']);
    }

    public function test_nonexistent_user_returns_401_not_404(): void
    {
        // Must not enumerate whether the email exists
        $response = $this->postJson('/api/v1/auth/login', [
            'email'    => 'nobody@example.com',
            'password' => 'any-password',
        ]);

        $response->assertStatus(401)
                 ->assertJson(['message' => 'Invalid credentials.']);
    }

    public function test_reviewer_can_logout_and_token_is_revoked(): void
    {
        $reviewer = User::factory()->create();

        $loginResponse = $this->postJson('/api/v1/auth/login', [
            'email'    => $reviewer->email,
            'password' => 'password', // UserFactory default
        ]);

        $token = $loginResponse->json('data.token');

        $this->withHeader('Authorization', "Bearer {$token}")
             ->postJson('/api/v1/auth/logout')
             ->assertStatus(200);

        // Revoked token can no longer access protected routes
        $this->withHeader('Authorization', "Bearer {$token}")
             ->getJson('/api/v1/reviewer/reports')
             ->assertStatus(401);
    }

    // -------------------------------------------------------------------------
    // Listing reports
    // -------------------------------------------------------------------------

    public function test_reviewer_can_list_reports(): void
    {
        Report::factory()->count(3)->create();
        $reviewer = User::factory()->create();

        $response = $this->actingAs($reviewer, 'sanctum')
                         ->getJson('/api/v1/reviewer/reports');

        $response->assertStatus(200)
                 ->assertJsonCount(3, 'data')
                 ->assertJsonStructure([
                     'data' => [['id', 'title', 'vulnerability_type', 'status', 'created_at']],
                     'meta' => ['total', 'per_page', 'current_page'],
                 ]);
    }

    public function test_list_can_be_filtered_by_status(): void
    {
        Report::factory()->create(['status' => 'submitted']);
        Report::factory()->create(['status' => 'triaged']);
        Report::factory()->create(['status' => 'accepted']);
        $reviewer = User::factory()->create();

        $response = $this->actingAs($reviewer, 'sanctum')
                         ->getJson('/api/v1/reviewer/reports?status=triaged');

        $response->assertStatus(200)
                 ->assertJsonCount(1, 'data')
                 ->assertJsonPath('data.0.status', 'triaged');
    }

    public function test_list_can_be_filtered_by_vulnerability_type(): void
    {
        Report::factory()->create(['vulnerability_type' => 'xss']);
        Report::factory()->create(['vulnerability_type' => 'sql_injection']);
        $reviewer = User::factory()->create();

        $response = $this->actingAs($reviewer, 'sanctum')
                         ->getJson('/api/v1/reviewer/reports?vulnerability_type=xss');

        $response->assertStatus(200)
                 ->assertJsonCount(1, 'data')
                 ->assertJsonPath('data.0.vulnerability_type', 'xss');
    }

    public function test_list_can_be_filtered_by_severity_bucket(): void
    {
        $report = $this->createTriagedReport();
        TriageResult::where('report_id', $report->id)->update(['severity_bucket' => 'critical']);

        $otherReport = $this->createTriagedReport();
        TriageResult::where('report_id', $otherReport->id)->update(['severity_bucket' => 'low']);

        $reviewer = User::factory()->create();

        $response = $this->actingAs($reviewer, 'sanctum')
                         ->getJson('/api/v1/reviewer/reports?severity_bucket=critical');

        $response->assertStatus(200)
                 ->assertJsonCount(1, 'data');
    }

    public function test_list_can_be_sorted_by_priority_score_descending(): void
    {
        $lowReport  = $this->createTriagedReport();
        $highReport = $this->createTriagedReport();
        TriageResult::where('report_id', $lowReport->id)->update(['priority_score' => 10]);
        TriageResult::where('report_id', $highReport->id)->update(['priority_score' => 90]);

        $reviewer = User::factory()->create();

        $response = $this->actingAs($reviewer, 'sanctum')
                         ->getJson('/api/v1/reviewer/reports?sort_by=priority_score&sort_dir=desc');

        $response->assertStatus(200);
        $ids = collect($response->json('data'))->pluck('id');
        $this->assertEquals($highReport->id, $ids->first());
        $this->assertEquals($lowReport->id, $ids->last());
    }

    public function test_invalid_sort_field_is_rejected_with_422(): void
    {
        $reviewer = User::factory()->create();

        $this->actingAs($reviewer, 'sanctum')
             ->getJson('/api/v1/reviewer/reports?sort_by=injected_column')
             ->assertStatus(422);
    }

    // -------------------------------------------------------------------------
    // Report detail
    // -------------------------------------------------------------------------

    public function test_reviewer_can_view_report_detail(): void
    {
        $report   = $this->createTriagedReport();
        $reviewer = User::factory()->create();

        $response = $this->actingAs($reviewer, 'sanctum')
                         ->getJson("/api/v1/reviewer/reports/{$report->id}");

        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'data' => [
                         'id',
                         'title',
                         'vulnerability_type',
                         'reporter_severity_estimate',
                         'affected_area',
                         'reproduction_steps',
                         'impact_description',
                         'contact_email',
                         'status',
                         'has_attachment',
                         'triage_result' => [
                             'priority_score',
                             'severity_bucket',
                             'fingerprint',
                             'breakdown',
                         ],
                         'created_at',
                         'triaged_at',
                         'reviewed_at',
                     ],
                 ]);
    }

    public function test_report_detail_includes_triage_result(): void
    {
        $report   = $this->createTriagedReport();
        $reviewer = User::factory()->create();

        $response = $this->actingAs($reviewer, 'sanctum')
                         ->getJson("/api/v1/reviewer/reports/{$report->id}");

        $response->assertJsonPath('data.triage_result.priority_score', fn ($score) => is_int($score))
                 ->assertJsonPath('data.triage_result.severity_bucket', fn ($bucket) => in_array($bucket, ['low', 'medium', 'high', 'critical']));
    }

    public function test_report_detail_includes_breakdown_component_scores(): void
    {
        $report   = $this->createTriagedReport();
        $reviewer = User::factory()->create();

        $response = $this->actingAs($reviewer, 'sanctum')
                         ->getJson("/api/v1/reviewer/reports/{$report->id}");

        $response->assertStatus(200)
                 ->assertJsonPath('data.triage_result.breakdown.severity_score', fn ($value) => is_int($value))
                 ->assertJsonPath('data.triage_result.breakdown.vuln_type_score', fn ($value) => is_int($value))
                 ->assertJsonPath('data.triage_result.breakdown.completeness_score', fn ($value) => is_int($value))
                 ->assertJsonPath('data.triage_result.breakdown.impact_score', fn ($value) => is_int($value))
                 ->assertJsonPath('data.triage_result.breakdown.area_score', fn ($value) => is_int($value))
                 ->assertJsonPath('data.triage_result.breakdown.total', fn ($value) => is_int($value));
    }

    public function test_report_detail_does_not_expose_attachment_storage_path(): void
    {
        $report   = Report::factory()->withAttachment()->create(['status' => 'triaged', 'triaged_at' => now()]);
        TriageResult::factory()->for($report)->create();
        $reviewer = User::factory()->create();

        $response = $this->actingAs($reviewer, 'sanctum')
                         ->getJson("/api/v1/reviewer/reports/{$report->id}");

        $response->assertJsonMissingPath('data.attachment_storage_path');
    }

    public function test_nonexistent_report_returns_404(): void
    {
        $reviewer = User::factory()->create();

        $this->actingAs($reviewer, 'sanctum')
             ->getJson('/api/v1/reviewer/reports/00000000-0000-0000-0000-000000000000')
             ->assertStatus(404);
    }

    // -------------------------------------------------------------------------
    // Status disposition
    // -------------------------------------------------------------------------

    public function test_reviewer_can_accept_a_triaged_report(): void
    {
        $report   = $this->createTriagedReport();
        $reviewer = User::factory()->create();

        $response = $this->actingAs($reviewer, 'sanctum')
                         ->patchJson("/api/v1/reviewer/reports/{$report->id}/status", [
                             'status' => 'accepted',
                         ]);

        $response->assertStatus(200)
                 ->assertJsonPath('data.status', 'accepted');

        $this->assertDatabaseHas('reports', [
            'id'     => $report->id,
            'status' => 'accepted',
        ]);
    }

    public function test_reviewer_can_reject_a_triaged_report(): void
    {
        $report   = $this->createTriagedReport();
        $reviewer = User::factory()->create();

        $this->actingAs($reviewer, 'sanctum')
             ->patchJson("/api/v1/reviewer/reports/{$report->id}/status", ['status' => 'rejected'])
             ->assertStatus(200)
             ->assertJsonPath('data.status', 'rejected');
    }

    public function test_reviewer_can_set_needs_more_info_on_triaged_report(): void
    {
        $report   = $this->createTriagedReport();
        $reviewer = User::factory()->create();

        $this->actingAs($reviewer, 'sanctum')
             ->patchJson("/api/v1/reviewer/reports/{$report->id}/status", ['status' => 'needs_more_info'])
             ->assertStatus(200)
             ->assertJsonPath('data.status', 'needs_more_info');
    }

    public function test_reviewed_at_timestamp_is_set_on_disposition(): void
    {
        $report   = $this->createTriagedReport();
        $reviewer = User::factory()->create();

        $this->actingAs($reviewer, 'sanctum')
             ->patchJson("/api/v1/reviewer/reports/{$report->id}/status", ['status' => 'accepted']);

        $this->assertNotNull($report->fresh()->reviewed_at);
    }

    public function test_cannot_disposition_a_submitted_report(): void
    {
        $report   = Report::factory()->create(['status' => 'submitted']);
        $reviewer = User::factory()->create();

        $this->actingAs($reviewer, 'sanctum')
             ->patchJson("/api/v1/reviewer/reports/{$report->id}/status", ['status' => 'accepted'])
             ->assertStatus(422)
             ->assertJsonValidationErrors(['status']);
    }

    public function test_cannot_redisposition_an_already_accepted_report(): void
    {
        $report   = Report::factory()->create(['status' => 'accepted', 'reviewed_at' => now()]);
        $reviewer = User::factory()->create();

        $this->actingAs($reviewer, 'sanctum')
             ->patchJson("/api/v1/reviewer/reports/{$report->id}/status", ['status' => 'rejected'])
             ->assertStatus(422)
             ->assertJsonValidationErrors(['status']);
    }

    public function test_reviewer_can_override_an_already_accepted_report(): void
    {
        $report   = Report::factory()->create(['status' => 'accepted', 'reviewed_at' => now()]);
        $reviewer = User::factory()->create();

        $this->actingAs($reviewer, 'sanctum')
             ->patchJson("/api/v1/reviewer/reports/{$report->id}/status", [
                 'status' => 'rejected',
                 'override' => true,
             ])
             ->assertStatus(200)
             ->assertJsonPath('data.status', 'rejected');
    }

    public function test_cannot_redisposition_a_rejected_report(): void
    {
        $report   = Report::factory()->create(['status' => 'rejected', 'reviewed_at' => now()]);
        $reviewer = User::factory()->create();

        $this->actingAs($reviewer, 'sanctum')
             ->patchJson("/api/v1/reviewer/reports/{$report->id}/status", ['status' => 'accepted'])
             ->assertStatus(422)
             ->assertJsonValidationErrors(['status']);
    }

    public function test_override_still_cannot_disposition_a_submitted_report(): void
    {
        $report   = Report::factory()->create(['status' => 'submitted']);
        $reviewer = User::factory()->create();

        $this->actingAs($reviewer, 'sanctum')
             ->patchJson("/api/v1/reviewer/reports/{$report->id}/status", [
                 'status' => 'accepted',
                 'override' => true,
             ])
             ->assertStatus(422)
             ->assertJsonValidationErrors(['status']);
    }

    public function test_cannot_set_status_to_an_invalid_value(): void
    {
        $report   = $this->createTriagedReport();
        $reviewer = User::factory()->create();

        $this->actingAs($reviewer, 'sanctum')
             ->patchJson("/api/v1/reviewer/reports/{$report->id}/status", ['status' => 'hacked'])
             ->assertStatus(422)
             ->assertJsonValidationErrors(['status']);
    }

    public function test_cannot_set_status_back_to_submitted(): void
    {
        $report   = $this->createTriagedReport();
        $reviewer = User::factory()->create();

        $this->actingAs($reviewer, 'sanctum')
             ->patchJson("/api/v1/reviewer/reports/{$report->id}/status", ['status' => 'submitted'])
             ->assertStatus(422)
             ->assertJsonValidationErrors(['status']);
    }

    // -------------------------------------------------------------------------
    // Attachment download
    // -------------------------------------------------------------------------

    public function test_reviewer_can_download_attachment(): void
    {
        Storage::fake('local');

        Storage::disk('local')->put('reports/test-uuid.pdf', 'fake pdf content');

        $report = Report::factory()->create([
            'status'                   => 'triaged',
            'triaged_at'               => now(),
            'attachment_original_name' => 'evidence.pdf',
            'attachment_storage_path'  => 'reports/test-uuid.pdf',
            'attachment_mime'          => 'application/pdf',
            'attachment_size_bytes'    => 16,
        ]);

        $reviewer = User::factory()->create();

        $response = $this->actingAs($reviewer, 'sanctum')
                         ->get("/api/v1/reviewer/reports/{$report->id}/attachment");

        $response->assertStatus(200);

        // Attachment must be a download, never rendered inline (security requirement)
        $contentDisposition = $response->headers->get('Content-Disposition');
        $this->assertNotNull($contentDisposition);
        $this->assertStringStartsWith('attachment', $contentDisposition);
        $this->assertStringContainsString('evidence.pdf', $contentDisposition);
    }

    public function test_downloading_attachment_from_report_with_no_file_returns_404(): void
    {
        $report   = Report::factory()->create(['attachment_storage_path' => null]);
        $reviewer = User::factory()->create();

        $this->actingAs($reviewer, 'sanctum')
             ->get("/api/v1/reviewer/reports/{$report->id}/attachment")
             ->assertStatus(404);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function createTriagedReport(array $reportOverrides = []): Report
    {
        $report = Report::factory()->create(array_merge(
            ['status' => 'triaged', 'triaged_at' => now()],
            $reportOverrides,
        ));

        TriageResult::factory()->for($report)->create();

        return $report;
    }
}
