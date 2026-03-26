<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class UpdateReportStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Authorization handled by middleware (auth:sanctum)
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => [
                'required',
                'string',
                'in:accepted,rejected,needs_more_info',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'status.in' => 'The status must be accepted, rejected, or needs_more_info.',
        ];
    }
}
