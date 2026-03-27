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
        $breakdown = $this->breakdown_json;

        if ($breakdown instanceof \Illuminate\Support\Collection) {
            return $breakdown->toArray();
        }

        if (is_array($breakdown)) {
            return $breakdown;
        }

        if (is_string($breakdown)) {
            $decoded = json_decode($breakdown, true);
            return is_array($decoded) ? $decoded : [];
        }

        $rawBreakdown = $this->getRawOriginal('breakdown_json');
        if (! is_string($rawBreakdown) || trim($rawBreakdown) === '') {
            return [];
        }

        $decoded = json_decode($rawBreakdown, true);
        if (is_array($decoded)) {
            return $decoded;
        }

        if (is_string($decoded)) {
            $decodedNested = json_decode($decoded, true);
            if (is_array($decodedNested)) {
                return $decodedNested;
            }
        }

        return [];
    }
}
