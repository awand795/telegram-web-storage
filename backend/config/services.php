<?php

return [
    'telegram' => [
        'bot_username' => env('TELEGRAM_BOT_USERNAME'),
        'bot_token' => env('TELEGRAM_BOT_TOKEN'),
        'local_api_url' => env('TELEGRAM_LOCAL_API_URL'),
    ],

    'frontend_url' => env('FRONTEND_URL', 'http://localhost:5173'),
];
