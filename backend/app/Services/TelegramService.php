<?php

namespace App\Services;

use App\Models\Bot;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramService
{
    private string $apiBase;
    private string $fileBase;

    public function __construct()
    {
        // Use local Bot API server if configured, otherwise fallback to cloud API
        $localApi = config('services.telegram.local_api_url');
        if ($localApi) {
            $this->apiBase = rtrim($localApi, '/') . '/bot';
            $this->fileBase = rtrim($localApi, '/') . '/file/bot';
        } else {
            $this->apiBase = 'https://api.telegram.org/bot';
            $this->fileBase = 'https://api.telegram.org/file/bot';
        }
    }

    public function sendDocument(Bot $bot, string $filePath, string $fileName): array
    {
        $token = $bot->token_encrypted; // auto-decrypted by 'encrypted' cast
        $url = $this->apiBase . $token . '/sendDocument';

        $response = Http::attach(
            'document',
            file_get_contents($filePath),
            $fileName
        )->post($url, [
            'chat_id' => $bot->chat_id,
        ]);

        if (!$response->successful()) {
            Log::error('Telegram sendDocument failed', [
                'bot_id' => $bot->id,
                'response' => $response->body(),
            ]);
            throw new \RuntimeException('Telegram API error: ' . $response->body());
        }

        $result = $response->json()['result'];

        return [
            'file_id' => $result['document']['file_id'],
            'message_id' => (string) $result['message_id'],
        ];
    }

    public function getFile(string $botToken, string $fileId): array
    {
        $url = $this->apiBase . $botToken . '/getFile?file_id=' . $fileId;

        $response = Http::get($url);

        if (!$response->successful()) {
            throw new \RuntimeException('Telegram getFile failed');
        }

        return $response->json()['result'];
    }

    public function getFileUrl(string $botToken, string $filePath): string
    {
        return $this->fileBase . $botToken . '/' . $filePath;
    }

    public function deleteMessage(Bot $bot, string $messageId): bool
    {
        $token = $bot->token_encrypted; // auto-decrypted by 'encrypted' cast
        $url = $this->apiBase . $token . '/deleteMessage';

        $response = Http::post($url, [
            'chat_id' => $bot->chat_id,
            'message_id' => (int) $messageId,
        ]);

        return $response->successful();
    }

    public function getChatId(string $botToken): ?string
    {
        $url = $this->apiBase . $botToken . '/getUpdates';

        $response = Http::post($url, [
            'timeout' => 5,
            'allowed_updates' => ['message'],
        ]);

        if (!$response->successful()) {
            return null;
        }

        $updates = $response->json()['result'] ?? [];
        if (empty($updates)) {
            return null;
        }

        return (string) $updates[0]['message']['chat']['id'];
    }
}
