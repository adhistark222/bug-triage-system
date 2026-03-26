<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Report;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Report>
 */
class ReportFactory extends Factory
{
    private const VULNERABILITY_TYPES = [
        'sql_injection', 'xss', 'csrf', 'authentication_bypass',
        'authorization_bypass', 'rce', 'ssrf', 'information_disclosure',
        'insecure_deserialization', 'path_traversal', 'other',
    ];

    private const SEVERITY_ESTIMATES = ['low', 'medium', 'high', 'critical'];

    private const STATUSES = ['submitted', 'triaged', 'accepted', 'rejected', 'needs_more_info'];

    public function definition(): array
    {
        return [
            'title'                      => fake()->sentence(8),
            'vulnerability_type'         => fake()->randomElement(self::VULNERABILITY_TYPES),
            'reporter_severity_estimate' => fake()->randomElement(self::SEVERITY_ESTIMATES),
            'affected_area'              => fake()->words(3, true),
            'reproduction_steps'         => fake()->paragraphs(2, true),
            'impact_description'         => fake()->paragraph(),
            'contact_email'              => fake()->safeEmail(),
            'status'                     => 'submitted',
            'attachment_original_name'   => null,
            'attachment_storage_path'    => null,
            'attachment_mime'            => null,
            'attachment_size_bytes'      => null,
            'triaged_at'                 => null,
            'reviewed_at'                => null,
        ];
    }

    public function withAttachment(): static
    {
        return $this->state(fn (array $attributes) => [
            'attachment_original_name' => 'evidence.pdf',
            'attachment_storage_path'  => 'reports/' . Str::uuid() . '.pdf',
            'attachment_mime'          => 'application/pdf',
            'attachment_size_bytes'    => 51200,
        ]);
    }

    public function triaged(): static
    {
        return $this->state(fn (array $attributes) => [
            'status'     => 'triaged',
            'triaged_at' => now(),
        ]);
    }

    public function accepted(): static
    {
        return $this->state(fn (array $attributes) => [
            'status'      => 'accepted',
            'triaged_at'  => now()->subMinutes(5),
            'reviewed_at' => now(),
        ]);
    }

    public function rejected(): static
    {
        return $this->state(fn (array $attributes) => [
            'status'      => 'rejected',
            'triaged_at'  => now()->subMinutes(5),
            'reviewed_at' => now(),
        ]);
    }
}
