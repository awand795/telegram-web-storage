<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\File;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UsageController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        // Admin bisa lihat semua, user biasa hanya milik sendiri
        $query = File::query();
        if (!$user->isAdmin()) {
            $query->where('user_id', $user->id);
        }

        $totalFiles = (clone $query)->count();
        $totalSize = (clone $query)->sum('size');
        $activeBots = $user->bots()->where('active', true)->count();

        $filesToday = (clone $query)
            ->whereDate('uploaded_at', today())
            ->count();

        $storageByType = (clone $query)
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
