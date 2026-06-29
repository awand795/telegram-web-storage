<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AuthController extends Controller
{
    public function redirect(): mixed
    {
        $botUsername = config('services.telegram.bot_username');
        $callback = route('auth.telegram.callback');

        return redirect("https://t.me/{$botUsername}?start=auth&redirect={$callback}");
    }

    public function callback(Request $request): mixed
    {
        $request->validate([
            'id' => 'required|string',
            'first_name' => 'required|string',
            'username' => 'nullable|string',
            'photo_url' => 'nullable|string',
            'auth_date' => 'required|string',
            'hash' => 'required|string',
        ]);

        // Verify Telegram hash
        $botToken = config('services.telegram.bot_token');
        $checkHash = $request->hash;

        $dataCheckArr = [];
        foreach ($request->except('hash') as $key => $value) {
            $dataCheckArr[] = "{$key}={$value}";
        }
        sort($dataCheckArr);
        $dataCheckString = implode("\n", $dataCheckArr);
        $secretKey = hash('sha256', $botToken, true);
        $hash = hash_hmac('sha256', $dataCheckString, $secretKey);

        if (!hash_equals($hash, $checkHash)) {
            Log::warning('Telegram OAuth hash verification failed', ['telegram_id' => $request->id]);
            return redirect('/login?error=invalid_hash');
        }

        $user = User::updateOrCreate(
            ['telegram_id' => $request->id],
            [
                'name' => $request->first_name,
                'username' => $request->username,
                'avatar_url' => $request->photo_url,
            ]
        );

        auth()->login($user, true);

        return redirect(config('services.frontend_url') . '/dashboard');
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($request->user()->load('bots'));
    }

    public function logout(Request $request): JsonResponse
    {
        auth()->guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(null, 204);
    }
}
