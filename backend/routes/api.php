<?php

use App\Http\Controllers\Api\V1\FileController;
use App\Http\Controllers\Api\V1\FolderController;
use App\Http\Controllers\Api\V1\UsageController;
use App\Http\Controllers\Api\V1\WebhookController;
use App\Http\Middleware\ApiKeyAuth;
use App\Http\Middleware\RateLimitByKey;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->middleware([ApiKeyAuth::class, RateLimitByKey::class])->group(function () {
    // Files
    Route::post('/files/upload', [FileController::class, 'upload']);
    Route::get('/files', [FileController::class, 'index']);
    Route::get('/files/{id}', [FileController::class, 'show']);
    Route::get('/files/{id}/download', [FileController::class, 'download']);
    Route::delete('/files/{id}', [FileController::class, 'destroy']);
    Route::patch('/files/{id}/tags', [FileController::class, 'updateTags']);

    // Folders
    Route::get('/folders', [FolderController::class, 'index']);
    Route::post('/folders', [FolderController::class, 'store']);

    // Usage
    Route::get('/usage', [UsageController::class, 'index']);

    // Webhooks
    Route::get('/webhooks', [WebhookController::class, 'index']);
    Route::post('/webhooks', [WebhookController::class, 'store']);
    Route::delete('/webhooks/{id}', [WebhookController::class, 'destroy']);
});
