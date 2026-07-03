<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Bot;
use App\Services\AuditService;
use App\Services\TelegramService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BotController extends Controller
{
    public function __construct(
        private TelegramService $telegram,
        private AuditService $auditService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $bots = $request->user()->bots()->orderBy('created_at', 'desc')->get();
        return response()->json($bots);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'token' => 'required|string',
        ]);

        // Validate token by calling Telegram getMe
        $botInfo = $this->telegram->getMe($request->token);
        if (!$botInfo) {
            return response()->json(['message' => 'Invalid bot token. Could not verify with Telegram.'], 422);
        }

        $chatId = $this->telegram->getChatId($request->token);

        $bot = Bot::create([
            'user_id' => $request->user()->id,
            'name' => $request->name,
            'token_encrypted' => $request->token,
            'token_preview' => substr($request->token, 0, 12) . '...',
            'chat_id' => $chatId,
            'active' => true,
        ]);

        $this->auditService->log(
            userId: $request->user()->id,
            action: 'create',
            targetType: 'bot',
            targetId: $bot->id,
            meta: ['name' => $request->name],
            request: $request,
        );

        return response()->json($bot, 201);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $bot = Bot::where('user_id', $request->user()->id)->findOrFail($id);
        $bot->files()->delete();
        $bot->folders()->delete();
        $bot->delete();

        $this->auditService->log(
            userId: $request->user()->id,
            action: 'delete',
            targetType: 'bot',
            targetId: $id,
            meta: ['name' => $bot->name],
            request: $request,
        );

        return response()->json(null, 204);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $bot = Bot::where('user_id', $request->user()->id)->findOrFail($id);

        $request->validate([
            'chat_id' => 'nullable|string|max:100',
        ]);

        if ($request->has('chat_id')) {
            $bot->update(['chat_id' => $request->chat_id]);
        }

        return response()->json($bot);
    }

    public function refreshChatId(Request $request, string $id): JsonResponse
    {
        $bot = Bot::where('user_id', $request->user()->id)->findOrFail($id);
        $token = $bot->token_encrypted;

        $chatId = $this->telegram->getChatId($token);

        if ($chatId) {
            $bot->update(['chat_id' => $chatId]);
            return response()->json(['chat_id' => $chatId, 'message' => 'Chat ID updated']);
        }

        return response()->json(['chat_id' => null, 'message' => 'No chat found. Send a message to the bot first.'], 404);
    }
}
