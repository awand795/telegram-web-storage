<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Folder;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FolderController extends Controller
{
    public function __construct(
        private AuditService $auditService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $folders = Folder::where('user_id', $request->user()->id)
            ->with('children')
            ->whereNull('parent_id')
            ->get();

        return response()->json(['data' => $folders]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'parent_id' => [
                'nullable',
                'string',
                'exists:folders,id',
                function ($attribute, $value, $fail) use ($request) {
                    if ($value) {
                        $parent = Folder::find($value);
                        if (!$parent || $parent->user_id !== $request->user()->id) {
                            $fail('The selected parent folder does not belong to you.');
                        }
                    }
                },
            ],
        ]);

        $bot = $request->user()->bots()->where('active', true)->first();
        if (!$bot) {
            return response()->json(['message' => 'No active bot found'], 400);
        }

        $folder = Folder::create([
            'user_id' => $request->user()->id,
            'bot_id' => $bot->id,
            'name' => $request->name,
            'parent_id' => $request->parent_id,
            'path' => $this->buildPath($request->parent_id, $request->name),
        ]);

        $this->auditService->log(
            userId: $request->user()->id,
            action: 'create',
            targetType: 'folder',
            targetId: $folder->id,
            meta: ['name' => $request->name],
            request: $request,
        );

        return response()->json(['data' => $folder], 201);
    }

    private function buildPath(?string $parentId, string $name): string
    {
        if (!$parentId) {
            return $name;
        }

        $parent = Folder::find($parentId);
        return $parent ? "{$parent->path}.{$name}" : $name;
    }
}
