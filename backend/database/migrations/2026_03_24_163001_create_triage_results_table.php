<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('triage_results', function (Blueprint $table) {
            // Primary key
            $table->uuid('id')->primary();

            // Foreign key to reports — unique because each report has only one current triage result
            $table->uuid('report_id');
            $table->unique('report_id');
            $table->foreign('report_id')
                  ->references('id')
                  ->on('reports')
                  ->onDelete('cascade');

            // Triage scores and classification
            $table->unsignedInteger('priority_score');
            $table->string('severity_bucket', 20);
            $table->string('fingerprint', 64);

            // Breakdown of score components as JSON
            $table->json('breakdown_json');

            // Timestamps
            $table->timestamps();

            // Indexes for dashboard filtering
            $table->index('severity_bucket');
            $table->index('priority_score');
            $table->index(['priority_score', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('triage_results');
    }
};
