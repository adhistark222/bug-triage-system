<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reports', function (Blueprint $table) {
            // Primary key
            $table->uuid('id')->primary();

            // Submission fields
            $table->string('title', 255);
            $table->string('vulnerability_type', 50);
            $table->string('reporter_severity_estimate', 20);
            $table->string('affected_area', 255);
            $table->text('reproduction_steps');
            $table->text('impact_description');
            $table->string('contact_email', 255);

            // Attachment metadata
            $table->string('attachment_original_name', 255)->nullable();
            $table->string('attachment_storage_path', 255)->nullable();
            $table->string('attachment_mime', 50)->nullable();
            $table->unsignedBigInteger('attachment_size_bytes')->nullable();

            // Workflow status
            $table->string('status', 30)->default('submitted');
            $table->timestamp('triaged_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();

            // Timestamps
            $table->timestamps();

            // Indexes for dashboard filtering/sorting
            $table->index('status');
            $table->index('vulnerability_type');
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reports');
    }
};
