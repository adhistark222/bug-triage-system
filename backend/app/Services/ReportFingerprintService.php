<?php

declare(strict_types=1);

namespace App\Services;

/**
 * Generates a deterministic SHA-256 fingerprint for a report.
 *
 * The fingerprint is based on:
 * - title
 * - vulnerability_type
 * - affected_area
 * - contact_email
 *
 * These four fields serve as a "duplicate detection" key. Two reports with
 * the same title, type, area, and reporter email are likely duplicates.
 *
 * Input is expected to be pre-normalized (trimmed/lowercased by ReportNormalizer).
 */
class ReportFingerprintService
{
    /**
     * Generate a SHA-256 fingerprint from the given data.
     *
     * @param array $data Must contain: title, vulnerability_type, affected_area, contact_email
     * @return string 64-character hex SHA-256 hash
     */
    public function generate(array $data): string
    {
        $components = [
            $data['title'] ?? '',
            $data['vulnerability_type'] ?? '',
            $data['affected_area'] ?? '',
            $data['contact_email'] ?? '',
        ];

        $combined = implode('|', $components);

        return hash('sha256', $combined);
    }
}
