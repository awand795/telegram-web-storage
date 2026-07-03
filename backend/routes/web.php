<?php

use App\Http\Controllers\Web\ApiKeyController;
use App\Http\Controllers\Web\AuditController;
use App\Http\Controllers\Web\AuthController;
use App\Http\Controllers\Web\BotController;
use Illuminate\Support\Facades\Route;

// Public auth routes
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

// Telegram OAuth
Route::get('/auth/telegram', [AuthController::class, 'redirect'])->name('auth.telegram.redirect');
Route::get('/auth/telegram/callback', [AuthController::class, 'callback'])->name('auth.telegram.callback');

// Web SPA (Sanctum) — under /web/ prefix, must be authenticated
Route::prefix('web')->middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Bots
    Route::get('/bots', [BotController::class, 'index']);
    Route::post('/bots', [BotController::class, 'store']);
    Route::delete('/bots/{id}', [BotController::class, 'destroy']);

    // API Keys
    Route::get('/apikeys', [ApiKeyController::class, 'index']);
    Route::post('/apikeys', [ApiKeyController::class, 'store']);
    Route::delete('/apikeys/{id}', [ApiKeyController::class, 'destroy']);

    // Admin-only routes
    Route::middleware('admin')->group(function () {
        Route::get('/audit', [AuditController::class, 'index']);
        Route::get('/users', function () {
            return \App\Models\User::all();
        });
    });
});
