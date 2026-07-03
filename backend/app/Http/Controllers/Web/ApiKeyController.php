<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\ApiKey;
use App\Services\ApiKeyService;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ApiKeyController extends Controller
{
    public function __construct(
        private ApiKeyService $apiKeyService,
        private AuditService $auditService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $keys = $request->user()->apiKeys()->orderBy('created_at', 'desc')->get();
        return response()->json($keys);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'rate_limit' => 'nullable|integer|min:1|max:1000',
        ]);

        $apiKey = ApiKey::create([
            'user_id' => $request->user()->id,
            'name' => $request->name,
            'rate_limit' => $request->input('rate_limit', 60),
        ]);

        $plaintext = $this->apiKeyService->generate($apiKey);

        $this->auditService->log(
            userId: $request->user()->id,
            action: 'create',
            targetType: 'api_key',
            targetId: $apiKey->id,
            meta: ['name' => $request->name],
            request: $request,
        );

        return response()->json([
            'data' => $apiKey,
            'plain_text_key' => $plaintext,
        ], 201);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $apiKey = ApiKey::where('user_id', $request->user()->id)->findOrFail($id);
        $this->apiKeyService->revoke($apiKey);

        $this->auditService->log(
            userId: $request->user()->id,
            action: 'revoke',
            targetType: 'api_key',
            targetId: $id,
            meta: ['name' => $apiKey->name],
            request: $request,
        );

        return response()->json(null, 204);
    }
}
