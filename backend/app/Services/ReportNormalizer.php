<?php

declare(strict_types=1);

namespace App\Services;

/**
 * Normalizes report fields for deterministic hashing and scoring.
 *
 * Trimming and lowercasing ensures that whitespace/case differences don't
 * affect fingerprinting or scoring logic.
 */
class ReportNormalizer
{
    public function normalize(array $data): array
    {
        return [
            'title'              => trim($data['title'] ?? ''),
            'vulnerability_type' => trim(strtolower($data['vulnerability_type'] ?? '')),
            'affected_area'      => trim(strtolower($data['affected_area'] ?? '')),
            'contact_email'      => trim(strtolower($data['contact_email'] ?? '')),
            'reproduction_steps' => trim($data['reproduction_steps'] ?? ''),
            'impact_description' => trim($data['impact_description'] ?? ''),
            'reporter_severity_estimate' => trim(strtolower($data['reporter_severity_estimate'] ?? '')),
        ];
    }
}
