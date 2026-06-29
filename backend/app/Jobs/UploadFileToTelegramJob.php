<?php

namespace App\Jobs;

use App\Models\File;
use App\Services\TelegramService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class UploadFileToTelegramJob implements ShouldQueue
{
    use Dispatchable, Queueable;

    public function __construct(
        public string $fileId,
    ) {
        $this->onQueue('uploads');
    }

    public function handle(TelegramService $telegram): void
    {
        $file = File::find($this->fileId);

        if (!$file || $file->status !== 'pending') {
            Log::warning('UploadFileToTelegramJob: file not found or not pending', [
                'file_id' => $this->fileId,
            ]);
            return;
        }

        $tempPath = $file->temp_path;

        try {
            $bot = $file->bot;

            if (!$bot || !$bot->active) {
                throw new \RuntimeException('Bot not found or inactive');
            }

            if (!$tempPath || !Storage::disk('local')->exists($tempPath)) {
                throw new \RuntimeException('Temp file not found: ' . $tempPath);
            }

            $fullPath = Storage::disk('local')->path($tempPath);

            $result = $telegram->sendDocument(
                $bot,
                $fullPath,
                $file->name,
            );

            $file->update([
                'telegram_file_id' => $result['file_id'],
                'message_id' => $result['message_id'],
                'status' => 'done',
                'temp_path' => null,
                'uploaded_at' => now(),
            ]);

            $file->refresh();

            // Clean up temp file
            if ($tempPath) {
                Storage::disk('local')->delete($tempPath);
            }

            // Dispatch webhook notification
            WebhookDispatchJob::dispatch(
                event: 'file.uploaded',
                payload: [
                    'file_id' => $file->id,
                    'name' => $file->name,
                    'size' => $file->size,
                    'mime_type' => $file->mime_type,
                    'status' => $file->status,
                    'uploaded_at' => $file->uploaded_at?->toIso8601String(),
                ],
                userId: $file->user_id,
            );

            Log::info('File uploaded to Telegram successfully', [
                'file_id' => $file->id,
                'telegram_file_id' => $result['file_id'],
            ]);
        } catch (\Throwable $e) {
            $file->update([
                'status' => 'failed',
                'temp_path' => null,
            ]);

            // Clean up temp file using captured path
            if ($tempPath) {
                Storage::disk('local')->delete($tempPath);
            }

            Log::error('UploadFileToTelegramJob failed', [
                'file_id' => $this->fileId,
                'error' => $e->getMessage(),
            ]);

            // Dispatch webhook notification for failure
            WebhookDispatchJob::dispatch(
                event: 'file.failed',
                payload: [
                    'file_id' => $file->id,
                    'name' => $file->name,
                    'error' => $e->getMessage(),
                ],
                userId: $file->user_id,
            );

            throw $e;
        }
    }
}
