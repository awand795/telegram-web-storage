<?php

use App\Http\Middleware\AdminMiddleware;
use App\Http\Middleware\ApiKeyAuth;
use App\Http\Middleware\RateLimitByKey;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'admin' => AdminMiddleware::class,
            'api-key' => ApiKeyAuth::class,
            'rate-limit-key' => RateLimitByKey::class,
        ]);

        $middleware->statefulApi();

        // Exclude auth routes from CSRF for API token-based auth
        $middleware->validateCsrfTokens(except: [
            '/auth/register',
            '/auth/login',
            '/auth/logout',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
