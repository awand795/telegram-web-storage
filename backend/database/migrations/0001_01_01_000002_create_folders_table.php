<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('folders', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUlid('bot_id')->constrained('bots')->cascadeOnDelete();
            $table->string('name');
            $table->foreignUlid('parent_id')->nullable()->constrained('folders')->cascadeOnDelete();
            $table->string('path'); // ltree path like "root.child.grandchild"
            $table->timestamps();

            $table->index('user_id');
            $table->index('parent_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('folders');
    }
};
