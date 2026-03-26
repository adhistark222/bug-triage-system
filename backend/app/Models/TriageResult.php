<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\TriageResultFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\AsCollection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

#[Fillable([
    'report_id',
    'priority_score',
    'severity_bucket',
    'fingerprint',
    'breakdown_json',
])]
class TriageResult extends Model
{
    /** @use HasFactory<TriageResultFactory> */
    use HasFactory, HasUuids;

    protected $table = 'triage_results';

    // =========================================================================
    // Relationships
    // =========================================================================

    public function report(): BelongsTo
    {
        return $this->belongsTo(Report::class);
    }

    // =========================================================================
    // Casting
    // =========================================================================

    protected function casts(): array
    {
        return [
            'breakdown_json' => AsCollection::class,
            'priority_score' => 'integer',
        ];
    }

    // =========================================================================
    // Accessors
    // =========================================================================

    /**
     * Get the breakdown scores as a keyed array (not a Collection).
     * This is used in API responses.
     */
    public function getBreakdownArray(): array
    {
        return $this->breakdown_json?->toArray() ?? [];
    }
}
