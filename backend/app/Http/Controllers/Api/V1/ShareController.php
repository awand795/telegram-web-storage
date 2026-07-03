<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\File;
use App\Services\StorageService;
use App\Services\TelegramService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ShareController extends Controller
{
    public function __construct(
        private StorageService $storageService,
        private TelegramService $telegramService,
    ) {}

    /**
     * Generate or get existing share token for a file (authenticated).
     */
    public function generate(Request $request, string $id): JsonResponse
    {
        $query = File::query()->whereNull('parent_id');
        if (!$request->user()->isAdmin()) {
            $query->where('user_id', $request->user()->id);
        }
        $file = $query->findOrFail($id);

        if ($file->status !== 'done') {
            return response()->json(['message' => 'File is not ready yet'], 400);
        }

        // Generate token if not exists
        if (!$file->share_token) {
            $file->update([
                'share_token' => Str::random(32),
            ]);
            $file->refresh();
        }

        $shareUrl = url('/s/' . $file->share_token);

        return response()->json([
            'share_token' => $file->share_token,
            'share_url' => $shareUrl,
        ]);
    }

    /**
     * Revoke share token (authenticated).
     */
    public function revoke(Request $request, string $id): JsonResponse
    {
        $query = File::query()->whereNull('parent_id');
        if (!$request->user()->isAdmin()) {
            $query->where('user_id', $request->user()->id);
        }
        $file = $query->findOrFail($id);

        $file->update(['share_token' => null]);

        return response()->json(['message' => 'Share link revoked']);
    }

    /**
     * Public: show file info via share token (no auth).
     */
    public function show(string $token): JsonResponse
    {
        $file = File::where('share_token', $token)
            ->whereNull('parent_id')
            ->where('status', 'done')
            ->first();

        if (!$file) {
            return response()->json(['message' => 'File not found or link is invalid'], 404);
        }

        return response()->json([
            'data' => [
                'name' => $file->name,
                'size' => $file->size,
                'mime_type' => $file->mime_type,
                'uploaded_at' => $file->uploaded_at?->toIso8601String(),
                'share_token' => $file->share_token,
            ],
        ]);
    }

    /**
     * Public: download file via share token (no auth).
     */
    public function download(string $token): mixed
    {
        $file = File::where('share_token', $token)
            ->whereNull('parent_id')
            ->where('status', 'done')
            ->first();

        if (!$file) {
            return response()->json(['message' => 'File not found or link is invalid'], 404);
        }

        // Handle chunked files: reassemble before download
        if ($file->is_chunked) {
            try {
                $reassembledPath = $this->storageService->reassembleFile($file);
                $fullPath = Storage::disk('local')->path($reassembledPath);

                return response()->download($fullPath, $file->name)->deleteFileAfterSend();
            } catch (\Throwable $e) {
                Log::error('Failed to reassemble chunked file for public download', [
                    'file_id' => $file->id,
                    'error' => $e->getMessage(),
                ]);
                return response()->json(['message' => 'Failed to prepare file for download'], 500);
            }
        }

        // Normal file: redirect to Telegram file URL
        if (!$file->telegram_file_id) {
            return response()->json(['message' => 'File not ready'], 404);
        }

        $bot = $file->bot;
        $token = $bot->token_encrypted;

        $telegramFile = $this->telegramService->getFile($token, $file->telegram_file_id);
        $fileUrl = $this->telegramService->getFileUrl($token, $telegramFile['file_path']);

        return redirect()->away($fileUrl);
    }
}
