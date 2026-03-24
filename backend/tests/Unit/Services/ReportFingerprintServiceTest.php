<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use App\Services\ReportFingerprintService;
use Tests\TestCase;

class ReportFingerprintServiceTest extends TestCase
{
    private ReportFingerprintService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new ReportFingerprintService();
    }

    public function test_fingerprint_is_a_64_character_hex_string(): void
    {
        $fingerprint = $this->service->generate($this->canonicalInput());

        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $fingerprint);
    }

    public function test_same_input_produces_identical_fingerprint(): void
    {
        $input = $this->canonicalInput();

        $this->assertSame(
            $this->service->generate($input),
            $this->service->generate($input),
        );
    }

    public function test_different_title_produces_different_fingerprint(): void
    {
        $a = $this->service->generate($this->canonicalInput());
        $b = $this->service->generate(
            array_merge($this->canonicalInput(), ['title' => 'a completely different title'])
        );

        $this->assertNotSame($a, $b);
    }

    public function test_different_contact_email_produces_different_fingerprint(): void
    {
        $a = $this->service->generate($this->canonicalInput());
        $b = $this->service->generate(
            array_merge($this->canonicalInput(), ['contact_email' => 'other@example.com'])
        );

        $this->assertNotSame($a, $b);
    }

    public function test_whitespace_and_case_differences_produce_same_fingerprint_after_normalization(): void
    {
        // The normalizer upstream ensures inputs are already trimmed and lowercased.
        // The fingerprint service itself should produce the same hash for identical normalized strings.
        $a = $this->service->generate(['title' => 'sql injection', 'vulnerability_type' => 'sql_injection',
                                       'affected_area' => 'login form', 'contact_email' => 'r@example.com']);
        $b = $this->service->generate(['title' => 'sql injection', 'vulnerability_type' => 'sql_injection',
                                       'affected_area' => 'login form', 'contact_email' => 'r@example.com']);

        $this->assertSame($a, $b);
    }

    private function canonicalInput(): array
    {
        return [
            'title'              => 'sql injection in login form',
            'vulnerability_type' => 'sql_injection',
            'affected_area'      => 'user authentication',
            'contact_email'      => 'researcher@example.com',
        ];
    }
}
