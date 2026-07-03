<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('files', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('bot_id')->constrained('bots')->cascadeOnDelete();
            $table->foreignUlid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('telegram_file_id')->nullable()->unique();
            $table->string('message_id')->nullable();
            $table->string('name');
            $table->bigInteger('size');
            $table->string('mime_type');
            $table->ulid('folder_id')->nullable();
            $table->jsonb('tags')->default('[]');
            $table->string('status')->default('pending'); // pending, done, failed
            $table->timestamp('uploaded_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'folder_id']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('files');
    }
};
