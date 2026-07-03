<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('files', function (Blueprint $table) {
            $table->foreignUlid('parent_id')
                ->nullable()
                ->after('id')
                ->constrained('files')
                ->cascadeOnDelete();

            $table->integer('chunk_index')
                ->nullable()
                ->after('parent_id');

            $table->boolean('is_chunked')
                ->default(false)
                ->after('chunk_index');

            $table->index(['parent_id', 'chunk_index']);
        });
    }

    public function down(): void
    {
        Schema::table('files', function (Blueprint $table) {
            $table->dropIndex(['parent_id', 'chunk_index']);
            $table->dropColumn(['parent_id', 'chunk_index', 'is_chunked']);
        });
    }
};
