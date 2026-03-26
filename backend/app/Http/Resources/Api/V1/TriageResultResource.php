<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\TriageResult
 */
class TriageResultResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'priority_score' => $this->priority_score,
            'severity_bucket' => $this->severity_bucket,
            'fingerprint' => $this->fingerprint,
            'breakdown' => $this->getBreakdownArray(),
        ];
    }
}
