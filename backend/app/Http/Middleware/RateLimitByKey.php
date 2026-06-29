<?php

namespace App\Http\Middleware;

use App\Models\ApiKey;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class RateLimitByKey
{
    public function handle(Request $request, Closure $next): Response
    {
        /** @var ApiKey|null $apiKey */
        $apiKey = $request->get('api_key');

        if (!$apiKey) {
            return $next($request);
        }

        $key = "rate_limit:{$apiKey->id}";
        $limit = $apiKey->rate_limit;
        $current = (int) Cache::get($key, 0);

        if ($current >= $limit) {
            return response()->json([
                'message' => 'Rate limit exceeded',
                'limit' => $limit,
                'retry_after' => 60,
            ], 429);
        }

        Cache::add($key, 0, 60);
        Cache::increment($key);

        return $next($request);
    }
}
