<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Settings for cross-origin requests. The frontend SPA needs to make
    | credentialed requests to the API for Sanctum SPA authentication.
    |
    */

    'paths' => ['api/*', 'web/*', 'auth/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => explode(',', (string) env('CORS_ALLOWED_ORIGINS', 'http://localhost:5173')),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,
];
