<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('api_keys', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('name');
            $table->string('key_hash');
            $table->string('key_preview'); // first 12 chars for display
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->integer('rate_limit')->default(60);
            $table->timestamps();

            $table->index('key_hash');
            $table->index(['user_id', 'revoked_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('api_keys');
    }
};
