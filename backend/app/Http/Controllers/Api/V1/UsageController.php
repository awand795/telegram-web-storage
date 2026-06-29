<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\File;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UsageController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $totalFiles = File::where('user_id', $userId)->count();
        $totalSize = File::where('user_id', $userId)->sum('size');
        $activeBots = $request->user()->bots()->where('active', true)->count();
        $filesToday = File::where('user_id', $userId)
            ->whereDate('uploaded_at', today())
            ->count();

        $storageByType = File::where('user_id', $userId)
            ->selectRaw("mime_type, COUNT(*) as count, SUM(size) as size")
            ->groupBy('mime_type')
            ->get()
            ->map(fn ($item) => [
                'mime_type' => $item->mime_type,
                'count' => (int) $item->count,
                'size' => (int) $item->size,
            ]);

        return response()->json([
            'total_files' => $totalFiles,
            'total_size' => $totalSize,
            'active_bots' => $activeBots,
            'files_today' => $filesToday,
            'storage_by_type' => $storageByType,
        ]);
    }
}
