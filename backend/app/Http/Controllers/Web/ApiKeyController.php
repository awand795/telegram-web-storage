<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\ApiKey;
use App\Services\ApiKeyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ApiKeyController extends Controller
{
    public function __construct(private ApiKeyService $apiKeyService) {}

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

        return response()->json([
            'data' => $apiKey,
            'plain_text_key' => $plaintext,
        ], 201);
    }

    public function destroy(string $id): JsonResponse
    {
        $apiKey = ApiKey::findOrFail($id);
        $this->apiKeyService->revoke($apiKey);

        return response()->json(null, 204);
    }
}
