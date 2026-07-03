<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\File;
use App\Services\StorageService;
use App\Services\TelegramService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FileController extends Controller
{
    public function __construct(
        private StorageService $storageService,
        private TelegramService $telegramService,
    ) {}

    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|max:2097152',
            'folder_id' => 'nullable|string|exists:folders,id',
        ]);

        $user = $request->user();
        $bot = $user->bots()->where('active', true)->first();

        if (!$bot) {
            return response()->json(['message' => 'No active bot found'], 400);
        }

        $file = $this->storageService->upload(
            $request->file('file'),
            $user,
            $bot,
            $request->input('folder_id'),
        );

        return response()->json([
            'job_id' => $file->id,
            'file_id' => null,
            'status' => 'pending',
            'message' => 'Upload queued. Poll GET /api/v1/files/' . $file->id . ' for completion.',
        ], 202);
    }

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'search' => 'nullable|string|max:100',
            'sort' => 'nullable|string|in:uploaded_at_desc,uploaded_at_asc,name_asc,name_desc,size_desc,size_asc',
            'folder' => 'nullable|string|exists:folders,id',
            'user_id' => 'nullable|string|exists:users,id',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $query = File::query();

        // Regular users only see their own files; admins can see all or filter by user
        if ($request->user()->isAdmin()) {
            if ($request->filled('user_id')) {
                $query->where('user_id', $request->user_id);
            }
        } else {
            $query->where('user_id', $request->user()->id);
        }

        if ($request->filled('search')) {
            $query->where('name', 'like', "%{$request->search}%");
        }
        if ($request->filled('folder')) {
            $query->where('folder_id', $request->folder);
        }

        $sort = match ($request->sort) {
            'uploaded_at_asc' => ['uploaded_at', 'asc'],
            'name_asc' => ['name', 'asc'],
            'name_desc' => ['name', 'desc'],
            'size_desc' => ['size', 'desc'],
            'size_asc' => ['size', 'asc'],
            default => ['uploaded_at', 'desc'],
        };

        $files = $query->orderBy(...$sort)->paginate($request->input('per_page', 50));

        return response()->json($files);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $query = File::query();
        if (!$request->user()->isAdmin()) {
            $query->where('user_id', $request->user()->id);
        }
        $file = $query->findOrFail($id);
        return response()->json(['data' => $file->load('folder')]);
    }

    public function download(Request $request, string $id): mixed
    {
        $query = File::query();
        if (!$request->user()->isAdmin()) {
            $query->where('user_id', $request->user()->id);
        }
        $file = $query->findOrFail($id);

        if (!$file->telegram_file_id) {
            return response()->json(['message' => 'File not ready'], 404);
        }

        $bot = $file->bot;
        $token = $bot->token_encrypted;

        $telegramFile = $this->telegramService->getFile($token, $file->telegram_file_id);
        $fileUrl = $this->telegramService->getFileUrl($token, $telegramFile['file_path']);

        return redirect()->away($fileUrl);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $query = File::query();
        if (!$request->user()->isAdmin()) {
            $query->where('user_id', $request->user()->id);
        }
        $file = $query->findOrFail($id);
        $bot = $file->bot;

        $this->storageService->delete($file, $bot);

        return response()->json(null, 204);
    }

    public function updateTags(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'tags' => 'required|array',
            'tags.*' => 'string|max:50',
        ]);

        $query = File::query();
        if (!$request->user()->isAdmin()) {
            $query->where('user_id', $request->user()->id);
        }
        $file = $query->findOrFail($id);
        $file->update(['tags' => $request->tags]);

        return response()->json(['data' => $file]);
    }
}
