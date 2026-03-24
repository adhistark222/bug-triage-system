<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\ReportFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\AsCollection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

#[Fillable([
    'title',
    'vulnerability_type',
    'reporter_severity_estimate',
    'affected_area',
    'reproduction_steps',
    'impact_description',
    'contact_email',
    'status',
    'attachment_original_name',
    'attachment_storage_path',
    'attachment_mime',
    'attachment_size_bytes',
    'triaged_at',
    'reviewed_at',
])]
class Report extends Model
{
    /** @use HasFactory<ReportFactory> */
    use HasFactory, HasUuids;

    protected $table = 'reports';

    // =========================================================================
    // Relationships
    // =========================================================================

    public function triageResult(): HasOne
    {
        return $this->hasOne(TriageResult::class);
    }

    // =========================================================================
    // Casting
    // =========================================================================

    protected function casts(): array
    {
        return [
            'triaged_at'  => 'datetime',
            'reviewed_at' => 'datetime',
        ];
    }

    // =========================================================================
    // Query Helpers
    // =========================================================================

    /**
     * Only retrieve reports with a triaged state.
     */
    public function scopeTriaged($query)
    {
        return $query->where('status', 'triaged');
    }

    /**
     * Only retrieve reports awaiting reviewer decision.
     */
    public function scopeAwaitingReview($query)
    {
        return $query->whereIn('status', ['submitted', 'triaged']);
    }

    // =========================================================================
    // Accessors / Helpers
    // =========================================================================

    /**
     * Determine if this report has an attached file.
     */
    public function hasAttachment(): bool
    {
        return ! is_null($this->attachment_storage_path);
    }

    /**
     * Determine if this report can be dispositioned by a reviewer.
     * Must be in 'triaged' status to accept a final decision.
     */
    public function canBeDispositioned(): bool
    {
        return $this->status === 'triaged';
    }

    /**
     * Determine if this report has already been dispositioned (final state reached).
     */
    public function isDispositioned(): bool
    {
        return in_array($this->status, ['accepted', 'rejected', 'needs_more_info']);
    }
}
