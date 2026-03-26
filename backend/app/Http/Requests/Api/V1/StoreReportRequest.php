<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class StoreReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Public endpoint — no authorization
        return true;
    }

    public function rules(): array
    {
        return [
            'title'                      => ['required', 'string', 'max:255'],
            'vulnerability_type'         => [
                'required',
                'string',
                'in:rce,sql_injection,xss,csrf,authentication_bypass,authorization_bypass,ssrf,information_disclosure,insecure_deserialization,path_traversal,other',
            ],
            'reporter_severity_estimate' => [
                'required',
                'string',
                'in:low,medium,high,critical',
            ],
            'affected_area'              => ['required', 'string', 'max:255'],
            'reproduction_steps'         => ['required', 'string'],
            'impact_description'         => ['required', 'string'],
            'contact_email'              => ['required', 'email:rfc'],
            'attachment'                 => [
                'nullable',
                'file',
                'mimes:pdf,txt,png,jpg,jpeg,zip',
                'max:5120', // 5MB in KB
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'vulnerability_type.in'         => 'The vulnerability type must be one of the allowed types.',
            'reporter_severity_estimate.in' => 'The severity estimate must be low, medium, high, or critical.',
            'contact_email.email'           => 'The contact email must be a valid email address.',
            'attachment.mimes'              => 'The attachment must be a PDF, text, image, or ZIP file.',
            'attachment.max'                => 'The attachment must not exceed 5MB.',
        ];
    }
}
