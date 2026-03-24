<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Report
 */
class ReportResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                         => $this->id,
            'title'                      => $this->title,
            'vulnerability_type'         => $this->vulnerability_type,
            'reporter_severity_estimate' => $this->reporter_severity_estimate,
            'affected_area'              => $this->affected_area,
            'reproduction_steps'         => $this->reproduction_steps,
            'impact_description'         => $this->impact_description,
            'contact_email'              => $this->contact_email,
            'status'                     => $this->status,
            'has_attachment'             => $this->hasAttachment(),
            'triage_result'              => TriageResultResource::make($this->triageResult),
            'created_at'                 => $this->created_at?->toIso8601String(),
            'triaged_at'                 => $this->triaged_at?->toIso8601String(),
            'reviewed_at'                => $this->reviewed_at?->toIso8601String(),
        ];
    }
}
