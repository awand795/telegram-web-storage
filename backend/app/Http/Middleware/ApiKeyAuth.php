<?php

namespace App\Http\Middleware;

use App\Services\ApiKeyService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ApiKeyAuth
{
    public function __construct(private ApiKeyService $apiKeyService) {}

    public function handle(Request $request, Closure $next): Response
    {
        $header = $request->header('Authorization');

        if (!$header || !str_starts_with($header, 'Bearer ')) {
            return response()->json(['message' => 'Missing API key'], 401);
        }

        $key = substr($header, 7);

        // Coba verifikasi sebagai Sanctum token (untuk SPA)
        $user = $this->resolveSanctumToken($key);
        if ($user) {
            $request->setUserResolver(fn () => $user);
            return $next($request);
        }

        // Coba verifikasi sebagai API Key (untuk AI Agent)
        $apiKey = $this->apiKeyService->verify($key);
        if (!$apiKey) {
            return response()->json(['message' => 'Invalid API key'], 401);
        }

        $request->merge(['api_key' => $apiKey]);
        $request->setUserResolver(fn () => $apiKey->user);

        return $next($request);
    }

    private function resolveSanctumToken(string $token): ?\App\Models\User
    {
        // Sanctum token format: "1|ts_abc123..."
        $accessToken = \Laravel\Sanctum\PersonalAccessToken::findToken($token);
        if (!$accessToken) {
            return null;
        }

        /** @var \App\Models\User $user */
        $user = $accessToken->tokenable;

        if (!$user) {
            return null;
        }

        // Update last used at
        $accessToken->forceFill(['last_used_at' => now()])->save();

        return $user;
    }
}
