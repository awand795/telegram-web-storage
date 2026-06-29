<?php

return [
    'telegram' => [
        'bot_username' => env('TELEGRAM_BOT_USERNAME'),
        'bot_token' => env('TELEGRAM_BOT_TOKEN'),
    ],

    'frontend_url' => env('FRONTEND_URL', 'http://localhost:5173'),
];
