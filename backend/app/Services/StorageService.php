<?php

namespace App\Services;

use App\Jobs\UploadFileToTelegramJob;
use App\Models\Bot;
use App\Models\File;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class StorageService
{
    public function upload(UploadedFile $uploadedFile, User $user, Bot $bot, ?string $folderId = null): File
    {
        // Save file to temp storage
        $tempPath = $uploadedFile->store('uploads/' . $user->id, 'local');

        // Create file record with pending status
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

        // Dispatch async job
        UploadFileToTelegramJob::dispatch($file->id);

        return $file;
    }

    public function delete(File $file, Bot $bot): bool
    {
        $telegram = app(TelegramService::class);
        $deleted = $telegram->deleteMessage($bot, $file->message_id);

        if ($deleted) {
            $file->delete();
        }

        return $deleted;
    }
}
