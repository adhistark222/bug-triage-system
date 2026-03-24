<?php

declare(strict_types=1);

namespace App\Services;

/**
 * Scores a security report based on five deterministic factors.
 *
 * The algorithm is designed to be explainable (breakdown included) and deterministic
 * (same input always produces same output). It's not ML or statistical — just
 * heuristics based on severity estimate, vuln type, and content quality.
 *
 * Total score range: 0–100. This drives prioritization, not judgment.
 */
class ReportScoringService
{
    // =========================================================================
    // Severity estimate weights (0–30 points)
    // =========================================================================

    private const SEVERITY_WEIGHTS = [
        'low'      => 5,
        'medium'   => 12,
        'high'     => 22,
        'critical' => 30,
    ];

    // =========================================================================
    // Vulnerability type weights (0–25 points)
    // =========================================================================

    private const VULN_TYPE_WEIGHTS = [
        'rce'                         => 25,
        'sql_injection'               => 20,
        'ssrf'                        => 20,
        'authentication_bypass'       => 20,
        'insecure_deserialization'    => 20,
        'authorization_bypass'        => 18,
        'path_traversal'              => 15,
        'xss'                         => 12,
        'information_disclosure'      => 10,
        'csrf'                        => 8,
        'other'                       => 5,
    ];

    // =========================================================================
    // Area sensitivity keywords (0–5 points, highest wins)
    // =========================================================================

    private const AREA_KEYWORDS = [
        'payment' => 5,
        'billing' => 5,
        'auth'    => 5,
        'admin'   => 5,
        'api'     => 4,
        'database' => 4,
        'user'    => 3,
    ];

    /**
     * Score a report and return priority_score, severity_bucket, and breakdown.
     *
     * @param array $data Must contain: reporter_severity_estimate, vulnerability_type,
     *                    reproduction_steps, impact_description, affected_area
     * @return array {
     *   'priority_score': int 0–100,
     *   'severity_bucket': 'low'|'medium'|'high'|'critical',
     *   'breakdown': {
     *     'severity_score': int,
     *     'vuln_type_score': int,
     *     'completeness_score': int,
     *     'impact_score': int,
     *     'area_score': int,
     *     'total': int
     *   }
     * }
     */
    public function score(array $data): array
    {
        $severityScore    = $this->scoreSeverityEstimate($data['reporter_severity_estimate'] ?? 'low');
        $vulnTypeScore    = $this->scoreVulnerabilityType($data['vulnerability_type'] ?? 'other');
        $completenessScore = $this->scoreCompleteness($data['reproduction_steps'] ?? '');
        $impactScore      = $this->scoreImpact($data['impact_description'] ?? '');
        $areaScore        = $this->scoreArea($data['affected_area'] ?? '');

        $totalScore = $severityScore + $vulnTypeScore + $completenessScore + $impactScore + $areaScore;

        // Clamp to 0–100 as extra safety
        $totalScore = max(0, min(100, $totalScore));

        return [
            'priority_score'  => $totalScore,
            'severity_bucket' => $this->determineSeverityBucket($totalScore),
            'breakdown'       => [
                'severity_score'    => $severityScore,
                'vuln_type_score'   => $vulnTypeScore,
                'completeness_score' => $completenessScore,
                'impact_score'      => $impactScore,
                'area_score'        => $areaScore,
                'total'             => $totalScore,
            ],
        ];
    }

    /**
     * Score the reporter's severity estimate (0–30).
     */
    private function scoreSeverityEstimate(string $estimate): int
    {
        $estimate = strtolower(trim($estimate));
        return self::SEVERITY_WEIGHTS[$estimate] ?? self::SEVERITY_WEIGHTS['low'];
    }

    /**
     * Score the vulnerability type (0–25).
     */
    private function scoreVulnerabilityType(string $type): int
    {
        $type = strtolower(trim($type));
        return self::VULN_TYPE_WEIGHTS[$type] ?? self::VULN_TYPE_WEIGHTS['other'];
    }

    /**
     * Score based on completeness of reproduction steps (0–25).
     *
     * Completeness is measured by word count:
     * - <20 words: 0 (too vague)
     * - 20–50 words: 10 (acceptable)
     * - 51–100 words: 18 (good)
     * - >100 words: 25 (excellent)
     */
    private function scoreCompleteness(string $reproductionSteps): int
    {
        $wordCount = str_word_count($reproductionSteps);

        return match (true) {
            $wordCount < 20  => 0,
            $wordCount <= 50 => 10,
            $wordCount <= 100 => 18,
            default => 25,
        };
    }

    /**
     * Score based on impact description quality (0–15).
     *
     * Quality is measured by word count:
     * - <10 words: 0 (too vague)
     * - 10–30 words: 8 (acceptable)
     * - >30 words: 15 (good)
     */
    private function scoreImpact(string $impactDescription): int
    {
        $wordCount = str_word_count($impactDescription);

        return match (true) {
            $wordCount < 10  => 0,
            $wordCount <= 30 => 8,
            default => 15,
        };
    }

    /**
     * Score based on affected area sensitivity (0–5).
     *
     * Keywords matter: payment, auth, etc. are more critical.
     * Takes the highest matching keyword bonus.
     */
    private function scoreArea(string $area): int
    {
        $area = strtolower($area);
        $maxScore = 0;

        foreach (self::AREA_KEYWORDS as $keyword => $score) {
            if (str_contains($area, $keyword)) {
                $maxScore = max($maxScore, $score);
            }
        }

        return $maxScore;
    }

    /**
     * Determine the severity bucket from a numeric score (0–100).
     *
     * - 0–24: low
     * - 25–49: medium
     * - 50–74: high
     * - 75–100: critical
     */
    public function determineSeverityBucket(int $score): string
    {
        return match (true) {
            $score >= 75 => 'critical',
            $score >= 50 => 'high',
            $score >= 25 => 'medium',
            default      => 'low',
        };
    }
}
