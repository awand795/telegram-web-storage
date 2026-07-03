<?php

namespace App\Services;

use App\Jobs\UploadFileToTelegramJob;
use App\Models\Bot;
use App\Models\File;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class StorageService
{
    /** Files larger than this (1.9 GB) will be split into chunks for Telegram upload */
    private const CHUNK_THRESHOLD = 1900 * 1024 * 1024;

    /** Each chunk will be at most this size (1.9 GB) to stay under Telegram's 2GB limit */
    private const CHUNK_SIZE = 1900 * 1024 * 1024;

    public function __construct(
        private AuditService $auditService,
    ) {}

    public function upload(UploadedFile $uploadedFile, User $user, Bot $bot, ?string $folderId = null): File
    {
        // Save file to temp storage first
        $tempPath = $uploadedFile->store('uploads/' . $user->id, 'local');

        // Check if file needs chunking (> 1.9 GB)
        if ($uploadedFile->getSize() > self::CHUNK_THRESHOLD) {
            return $this->createChunkedUpload($tempPath, $uploadedFile, $user, $bot, $folderId);
        }

        // Normal upload for smaller files
        $file = File::create([
            'user_id' => $user->id,
            'bot_id' => $bot->id,
            'name' => $uploadedFile->getClientOriginalName(),
            'size' => $uploadedFile->getSize(),
            'mime_type' => $uploadedFile->getMimeType(),
            'folder_id' => $folderId,
            'temp_path' => $tempPath,
            'tags' => [],
            'status' => 'pending',
        ]);

        UploadFileToTelegramJob::dispatch($file->id);

        return $file;
    }

    private function createChunkedUpload(string $tempPath, UploadedFile $uploadedFile, User $user, Bot $bot, ?string $folderId): File
    {
        $fullPath = Storage::disk('local')->path($tempPath);
        $originalName = $uploadedFile->getClientOriginalName();
        $fileSize = $uploadedFile->getSize();
        $ext = pathinfo($originalName, PATHINFO_EXTENSION);
        $baseName = pathinfo($originalName, PATHINFO_FILENAME);

        // Split file into chunks using streaming (no memory overhead)
        $chunkDir = Storage::disk('local')->path('uploads/' . $user->id . '/chunks_temp');
        if (!is_dir($chunkDir)) {
            mkdir($chunkDir, 0755, true);
        }

        $handle = fopen($fullPath, 'rb');
        if (!$handle) {
            throw new \RuntimeException('Failed to open file for chunking: ' . $fullPath);
        }

        $chunkNum = 0;
        $chunkSizes = [];

        while (!feof($handle)) {
            $chunkFileName = $baseName . '.part' . str_pad((string)$chunkNum, 3, '0', STR_PAD_LEFT) . '.' . $ext;
            $chunkFullPath = $chunkDir . '/' . $chunkFileName;
            $chunkHandle = fopen($chunkFullPath, 'wb');

            if (!$chunkHandle) {
                fclose($handle);
                throw new \RuntimeException('Failed to create chunk file: ' . $chunkFullPath);
            }

            $bytesWritten = stream_copy_to_stream($handle, $chunkHandle, self::CHUNK_SIZE);
            fclose($chunkHandle);

            if ($bytesWritten > 0) {
                $chunkSizes[] = [
                    'name' => $chunkFileName,
                    'size' => $bytesWritten,
                    'index' => $chunkNum,
                ];
            }
            $chunkNum++;
        }
        fclose($handle);

        // Clean up original temp file
        Storage::disk('local')->delete($tempPath);

        // Create parent file record (chunked)
        $parent = File::create([
            'user_id' => $user->id,
            'bot_id' => $bot->id,
            'name' => $originalName,
            'size' => $fileSize,
            'mime_type' => $uploadedFile->getMimeType(),
            'folder_id' => $folderId,
            'temp_path' => null,
            'tags' => [],
            'status' => 'pending',
            'is_chunked' => true,
        ]);

        // Create chunk records and move files to storage (using rename to avoid OOM)
        foreach ($chunkSizes as $chunk) {
            $chunkTempPath = 'uploads/' . $user->id . '/chunks/' . $parent->id . '/' . $chunk['name'];
            $destPath = Storage::disk('local')->path($chunkTempPath);
            $destDir = dirname($destPath);
            if (!is_dir($destDir)) {
                mkdir($destDir, 0755, true);
            }
            rename($chunkDir . '/' . $chunk['name'], $destPath);

            $chunkFile = File::create([
                'user_id' => $user->id,
                'bot_id' => $bot->id,
                'parent_id' => $parent->id,
                'chunk_index' => $chunk['index'],
                'name' => $chunk['name'],
                'size' => $chunk['size'],
                'mime_type' => $uploadedFile->getMimeType(),
                'folder_id' => $folderId,
                'temp_path' => $chunkTempPath,
                'tags' => [],
                'status' => 'pending',
                'is_chunked' => false,
            ]);

            UploadFileToTelegramJob::dispatch($chunkFile->id);
        }

        // Clean up temp chunk files
        Storage::disk('local')->deleteDirectory('uploads/' . $user->id . '/chunks_temp');

        Log::info('Chunked upload created', [
            'file_id' => $parent->id,
            'name' => $originalName,
            'size' => $fileSize,
            'chunks' => count($chunkSizes),
        ]);

        return $parent;
    }

    /**
     * Download all chunks from Telegram and reassemble into a single temp file.
     * Returns the storage path to the reassembled file.
     */
    public function reassembleFile(File $file): string
    {
        if (!$file->is_chunked) {
            throw new \RuntimeException('File is not chunked');
        }

        $telegram = app(TelegramService::class);
        $chunks = $file->chunks()->where('status', 'done')->orderBy('chunk_index')->get();

        if ($chunks->isEmpty()) {
            throw new \RuntimeException('No completed chunks found for file: ' . $file->id);
        }

        if ($chunks->count() !== $file->chunks()->count()) {
            throw new \RuntimeException('Not all chunks are completed yet');
        }

        // Create temp path for reassembled file
        $reassemblyDir = 'reassembly/' . $file->id;
        Storage::disk('local')->makeDirectory($reassemblyDir);
        $tempRelativePath = $reassemblyDir . '/' . $file->name;
        $fullPath = Storage::disk('local')->path($tempRelativePath);

        $destHandle = fopen($fullPath, 'wb');
        if (!$destHandle) {
            throw new \RuntimeException('Failed to create reassembly file: ' . $fullPath);
        }

        $bot = $file->bot;
        $token = $bot->token_encrypted;

        try {
            foreach ($chunks as $chunk) {
                Log::info('Reassembling chunk', [
                    'file_id' => $file->id,
                    'chunk_index' => $chunk->chunk_index,
                    'chunk_id' => $chunk->id,
                ]);

                $telegramFile = $telegram->getFile($token, $chunk->telegram_file_id);
                $chunkUrl = $telegram->getFileUrl($token, $telegramFile['file_path']);

                // Stream chunk content directly to destination file
                $chunkStream = @fopen($chunkUrl, 'rb');
                if (!$chunkStream) {
                    throw new \RuntimeException('Failed to open chunk URL: ' . $chunkUrl);
                }

                $copied = stream_copy_to_stream($chunkStream, $destHandle);
                fclose($chunkStream);

                if ($copied === false) {
                    throw new \RuntimeException('Failed to download chunk ' . $chunk->chunk_index);
                }
            }

            fclose($destHandle);
        } catch (\Throwable $e) {
            fclose($destHandle);
            Storage::disk('local')->delete($tempRelativePath);
            throw $e;
        }

        Log::info('File reassembled successfully', [
            'file_id' => $file->id,
            'size' => filesize($fullPath),
            'chunks' => $chunks->count(),
        ]);

        return $tempRelativePath;
    }

    public function delete(File $file, Bot $bot, ?Request $request = null): bool
    {
        $telegram = app(TelegramService::class);

        // Clean up any reassembly temp files
        Storage::disk('local')->deleteDirectory('reassembly/' . $file->id);

        // Delete all chunks first if it's a chunked file
        if ($file->is_chunked) {
            foreach ($file->chunks as $chunk) {
                try {
                    $telegram->deleteMessage($bot, $chunk->message_id);
                } catch (\Throwable $e) {
                    Log::warning('Failed to delete chunk message', [
                        'chunk_id' => $chunk->id,
                        'error' => $e->getMessage(),
                    ]);
                }
                $chunk->delete();
            }
        } else {
            try {
                $telegram->deleteMessage($bot, $file->message_id);
            } catch (\Throwable $e) {
                Log::warning('Telegram deleteMessage failed, force-deleting file record', [
                    'file_id' => $file->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $file->delete();

        $actingUserId = $request?->user()?->id ?? $file->user_id;

        $this->auditService->log(
            userId: $actingUserId,
            action: 'delete',
            targetType: 'file',
            targetId: $file->id,
            meta: ['name' => $file->name, 'size' => $file->size],
            request: $request,
        );

        return true;
    }
}
