<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Report;
use App\Models\TriageResult;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<TriageResult>
 */
class TriageResultFactory extends Factory
{
    public function definition(): array
    {
        $severityScore     = fake()->numberBetween(5, 30);
        $vulnTypeScore     = fake()->numberBetween(5, 25);
        $completenessScore = fake()->numberBetween(0, 25);
        $impactScore       = fake()->numberBetween(0, 15);
        $areaScore         = fake()->randomElement([0, 3, 4, 5]);
        $total             = $severityScore + $vulnTypeScore + $completenessScore + $impactScore + $areaScore;

        return [
            'report_id'      => Report::factory(),
            'priority_score' => $total,
            'severity_bucket' => $this->bucketFor($total),
            'fingerprint'    => hash('sha256', Str::uuid()),
            'breakdown_json' => json_encode([
                'severity_score'     => $severityScore,
                'vuln_type_score'    => $vulnTypeScore,
                'completeness_score' => $completenessScore,
                'impact_score'       => $impactScore,
                'area_score'         => $areaScore,
                'total'              => $total,
            ]),
        ];
    }

    private function bucketFor(int $score): string
    {
        return match (true) {
            $score >= 75 => 'critical',
            $score >= 50 => 'high',
            $score >= 25 => 'medium',
            default      => 'low',
        };
    }
}
