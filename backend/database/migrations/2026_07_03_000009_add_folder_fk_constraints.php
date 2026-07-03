<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Clean up orphaned records before adding constraints
        DB::statement('DELETE FROM files WHERE folder_id IS NOT NULL AND folder_id NOT IN (SELECT id FROM folders)');
        DB::statement('DELETE FROM folders WHERE parent_id IS NOT NULL AND parent_id NOT IN (SELECT id FROM folders)');

        Schema::table('files', function (Blueprint $table) {
            $table->foreign('folder_id')->references('id')->on('folders')->nullOnDelete();
        });

        Schema::table('folders', function (Blueprint $table) {
            $table->foreign('parent_id')->references('id')->on('folders')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('files', function (Blueprint $table) {
            $table->dropForeign(['folder_id']);
        });

        Schema::table('folders', function (Blueprint $table) {
            $table->dropForeign(['parent_id']);
        });
    }
};
