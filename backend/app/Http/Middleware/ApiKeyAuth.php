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
        $apiKey = $this->apiKeyService->verify($key);

        if (!$apiKey) {
            return response()->json(['message' => 'Invalid API key'], 401);
        }

        $request->merge(['api_key' => $apiKey]);
        $request->setUserResolver(fn () => $apiKey->user);

        return $next($request);
    }
}
