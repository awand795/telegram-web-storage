<?php

namespace App\Jobs;

use App\Models\Webhook;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WebhookDispatchJob implements ShouldQueue
{
    use Dispatchable, Queueable;

    public function __construct(
        public string $event,
        public array $payload,
        public string $userId,
    ) {
        $this->onQueue('webhooks');
    }

    public function handle(): void
    {
        $webhooks = Webhook::where('user_id', $this->userId)
            ->where('active', true)
            ->get();

        $matching = $webhooks->filter(fn (Webhook $w) => in_array($this->event, $w->events));

        if ($matching->isEmpty()) {
            return;
        }

        $data = [
            'event' => $this->event,
            'timestamp' => now()->toIso8601String(),
            'data' => $this->payload,
        ];

        $body = json_encode($data);

        foreach ($matching as $webhook) {
            try {
                $secret = $webhook->secret_encrypted;
                $signature = $secret ? hash_hmac('sha256', $body, $secret) : null;

                $headers = [
                    'Content-Type' => 'application/json',
                    'X-Telestore-Event' => $this->event,
                ];

                if ($signature) {
                    $headers['X-Telestore-Signature'] = $signature;
                }

                $response = Http::withHeaders($headers)
                    ->timeout(10)
                    ->post($webhook->url, $data);

                if (!$response->successful()) {
                    Log::warning('Webhook dispatch failed', [
                        'webhook_id' => $webhook->id,
                        'url' => $webhook->url,
                        'event' => $this->event,
                        'status' => $response->status(),
                    ]);
                }
            } catch (\Throwable $e) {
                Log::error('Webhook dispatch error', [
                    'webhook_id' => $webhook->id,
                    'url' => $webhook->url,
                    'event' => $this->event,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }
}
