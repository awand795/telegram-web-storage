<?php

use App\Http\Controllers\Web\ApiKeyController;
use App\Http\Controllers\Web\AuditController;
use App\Http\Controllers\Web\AuthController;
use App\Http\Controllers\Web\BotController;
use Illuminate\Support\Facades\Route;

// Auth (no prefix)
Route::get('/auth/telegram', [AuthController::class, 'redirect'])->name('auth.telegram.redirect');
Route::get('/auth/telegram/callback', [AuthController::class, 'callback'])->name('auth.telegram.callback');
Route::post('/auth/logout', [AuthController::class, 'logout'])->middleware('auth');

// Web SPA (Sanctum) — under /web/ prefix
Route::prefix('web')->middleware('auth')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);

    // Bots
    Route::get('/bots', [BotController::class, 'index']);
    Route::post('/bots', [BotController::class, 'store']);
    Route::delete('/bots/{id}', [BotController::class, 'destroy']);

    // API Keys
    Route::get('/apikeys', [ApiKeyController::class, 'index']);
    Route::post('/apikeys', [ApiKeyController::class, 'store']);
    Route::delete('/apikeys/{id}', [ApiKeyController::class, 'destroy']);

    // Audit
    Route::get('/audit', [AuditController::class, 'index']);
});
