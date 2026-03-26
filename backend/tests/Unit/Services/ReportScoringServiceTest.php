<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use App\Services\ReportScoringService;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ReportScoringServiceTest extends TestCase
{
    private ReportScoringService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new ReportScoringService();
    }

    // -------------------------------------------------------------------------
    // Determinism — same input must always produce same output
    // -------------------------------------------------------------------------

    public function test_scoring_is_deterministic(): void
    {
        // Expected: high(22) + sql_injection(20) + 60 words completeness(18)
        //         + 20 words impact(8) + auth area(5) = 73
        $input = [
            'reporter_severity_estimate' => 'high',
            'vulnerability_type'         => 'sql_injection',
            'reproduction_steps'         => str_repeat('detail step ', 30),  // 60 words
            'impact_description'         => str_repeat('significant impact ', 10), // 20 words
            'affected_area'              => 'authentication system',
        ];

        $first  = $this->service->score($input);
        $second = $this->service->score($input);

        $this->assertSame($first['priority_score'], $second['priority_score']);
        $this->assertSame($first['severity_bucket'], $second['severity_bucket']);
        $this->assertSame($first['breakdown'], $second['breakdown']);
    }

    // -------------------------------------------------------------------------
    // Exact score verification — these lock the algorithm weights
    // -------------------------------------------------------------------------

    public function test_maximum_possible_score_is_100(): void
    {
        // critical(30) + rce(25) + 120 words(25) + 35 words(15) + payment area(5) = 100
        $result = $this->service->score([
            'reporter_severity_estimate' => 'critical',
            'vulnerability_type'         => 'rce',
            'reproduction_steps'         => str_repeat('step ', 120),
            'impact_description'         => str_repeat('impact ', 35),
            'affected_area'              => 'payment gateway',
        ]);

        $this->assertSame(100, $result['priority_score']);
        $this->assertSame('critical', $result['severity_bucket']);
    }

    public function test_minimum_with_valid_inputs_scores_correctly(): void
    {
        // low(5) + other(5) + 1 word(0) + 1 word(0) + no keyword(0) = 10
        $result = $this->service->score([
            'reporter_severity_estimate' => 'low',
            'vulnerability_type'         => 'other',
            'reproduction_steps'         => 'broken',
            'impact_description'         => 'minimal',
            'affected_area'              => 'general module',
        ]);

        $this->assertSame(10, $result['priority_score']);
        $this->assertSame('low', $result['severity_bucket']);
    }

    public function test_medium_severity_sql_injection_scores_62(): void
    {
        // medium(12) + sql_injection(20) + 60 words(18) + 15 words(8) + api area(4) = 62
        $result = $this->service->score([
            'reporter_severity_estimate' => 'medium',
            'vulnerability_type'         => 'sql_injection',
            'reproduction_steps'         => str_repeat('word ', 60),
            'impact_description'         => str_repeat('word ', 15),
            'affected_area'              => 'api endpoint',
        ]);

        $this->assertSame(62, $result['priority_score']);
        $this->assertSame('high', $result['severity_bucket']);
    }

    public function test_low_xss_with_partial_content_scores_30(): void
    {
        // low(5) + xss(12) + 30 words(10) + 5 words(0) + user area(3) = 30
        $result = $this->service->score([
            'reporter_severity_estimate' => 'low',
            'vulnerability_type'         => 'xss',
            'reproduction_steps'         => str_repeat('word ', 30),
            'impact_description'         => str_repeat('word ', 5),
            'affected_area'              => 'user profile page',
        ]);

        $this->assertSame(30, $result['priority_score']);
        $this->assertSame('medium', $result['severity_bucket']);
    }

    // -------------------------------------------------------------------------
    // Breakdown structure and integrity
    // -------------------------------------------------------------------------

    public function test_breakdown_contains_all_required_keys(): void
    {
        $result = $this->service->score($this->standardInput());

        $this->assertArrayHasKey('severity_score', $result['breakdown']);
        $this->assertArrayHasKey('vuln_type_score', $result['breakdown']);
        $this->assertArrayHasKey('completeness_score', $result['breakdown']);
        $this->assertArrayHasKey('impact_score', $result['breakdown']);
        $this->assertArrayHasKey('area_score', $result['breakdown']);
        $this->assertArrayHasKey('total', $result['breakdown']);
    }

    public function test_breakdown_components_sum_to_priority_score(): void
    {
        $result    = $this->service->score($this->standardInput());
        $breakdown = $result['breakdown'];

        $computed = $breakdown['severity_score']
            + $breakdown['vuln_type_score']
            + $breakdown['completeness_score']
            + $breakdown['impact_score']
            + $breakdown['area_score'];

        $this->assertSame($computed, $result['priority_score']);
        $this->assertSame($computed, $breakdown['total']);
    }

    public function test_priority_score_is_always_between_0_and_100(): void
    {
        $extremes = [
            // Absolute minimum values
            ['reporter_severity_estimate' => 'low', 'vulnerability_type' => 'other',
             'reproduction_steps' => 'a', 'impact_description' => 'b', 'affected_area' => 'x'],
            // Absolute maximum values
            ['reporter_severity_estimate' => 'critical', 'vulnerability_type' => 'rce',
             'reproduction_steps' => str_repeat('word ', 200), 'impact_description' => str_repeat('word ', 50),
             'affected_area' => 'payment authentication admin'],
        ];

        foreach ($extremes as $input) {
            $result = $this->service->score($input);
            $this->assertGreaterThanOrEqual(0, $result['priority_score']);
            $this->assertLessThanOrEqual(100, $result['priority_score']);
        }
    }

    // -------------------------------------------------------------------------
    // Severity bucket thresholds
    // -------------------------------------------------------------------------

    #[DataProvider('severityBucketProvider')]
    public function test_severity_bucket_is_correct_for_score(int $score, string $expectedBucket): void
    {
        $bucket = $this->service->determineSeverityBucket($score);

        $this->assertSame($expectedBucket, $bucket);
    }

    public static function severityBucketProvider(): array
    {
        return [
            'score 0 is low'        => [0,   'low'],
            'score 24 is low'       => [24,  'low'],
            'score 25 is medium'    => [25,  'medium'],
            'score 49 is medium'    => [49,  'medium'],
            'score 50 is high'      => [50,  'high'],
            'score 74 is high'      => [74,  'high'],
            'score 75 is critical'  => [75,  'critical'],
            'score 100 is critical' => [100, 'critical'],
        ];
    }

    // -------------------------------------------------------------------------
    // Area keyword matching
    // -------------------------------------------------------------------------

    public function test_payment_keyword_in_affected_area_scores_maximum_for_area(): void
    {
        $withPayment = $this->service->score(
            array_merge($this->standardInput(), ['affected_area' => 'payment processor'])
        );
        $withNothing = $this->service->score(
            array_merge($this->standardInput(), ['affected_area' => 'random module'])
        );

        $this->assertSame(5, $withPayment['breakdown']['area_score']);
        $this->assertSame(0, $withNothing['breakdown']['area_score']);
    }

    public function test_area_score_is_case_insensitive(): void
    {
        $lower = $this->service->score(
            array_merge($this->standardInput(), ['affected_area' => 'payment gateway'])
        );
        $upper = $this->service->score(
            array_merge($this->standardInput(), ['affected_area' => 'PAYMENT GATEWAY'])
        );

        $this->assertSame($lower['breakdown']['area_score'], $upper['breakdown']['area_score']);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function standardInput(): array
    {
        return [
            'reporter_severity_estimate' => 'medium',
            'vulnerability_type'         => 'xss',
            'reproduction_steps'         => str_repeat('word ', 60),
            'impact_description'         => str_repeat('word ', 15),
            'affected_area'              => 'user profile',
        ];
    }
}
