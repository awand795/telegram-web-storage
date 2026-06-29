<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Bot;
use App\Services\TelegramService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BotController extends Controller
{
    public function __construct(private TelegramService $telegram) {}

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

        $chatId = $this->telegram->getChatId($request->token);

        $bot = Bot::create([
            'user_id' => $request->user()->id,
            'name' => $request->name,
            'token_encrypted' => $request->token,
            'token_preview' => substr($request->token, 0, 12) . '...',
            'chat_id' => $chatId,
            'active' => true,
        ]);

        return response()->json($bot, 201);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $bot = Bot::where('user_id', $request->user()->id)->findOrFail($id);
        $bot->files()->delete();
        $bot->folders()->delete();
        $bot->delete();

        return response()->json(null, 204);
    }
}
