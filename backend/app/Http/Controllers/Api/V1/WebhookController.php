<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Webhook;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class WebhookController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $webhooks = Webhook::where('user_id', $request->user()->id)->get();
        return response()->json(['data' => $webhooks]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'url' => 'required|url',
            'events' => 'required|array|min:1',
            'events.*' => 'string|in:file.uploaded,file.deleted,file.failed,key.revoked,bot.added,bot.removed',
        ]);

        $webhook = Webhook::create([
            'user_id' => $request->user()->id,
            'url' => $request->url,
            'secret_encrypted' => Str::random(32),
            'events' => $request->events,
            'active' => true,
        ]);

        return response()->json(['data' => $webhook], 201);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $webhook = Webhook::where('user_id', $request->user()->id)->findOrFail($id);
        $webhook->delete();

        return response()->json(null, 204);
    }
}
