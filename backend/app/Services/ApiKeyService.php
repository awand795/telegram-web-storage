<?php

namespace App\Services;

use App\Models\ApiKey;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ApiKeyService
{
    public function generate(ApiKey $apiKey): string
    {
        $plaintext = 'ts_live_' . Str::random(64);

        $apiKey->update([
            'key_hash' => Hash::make($plaintext),
            'key_preview' => substr($plaintext, 0, 12) . '...',
        ]);

        return $plaintext;
    }

    public function verify(string $key): ?ApiKey
    {
        $prefix = 'ts_live_';
        if (!str_starts_with($key, $prefix)) {
            return null;
        }

        $apiKey = ApiKey::whereNull('revoked_at')->get()
            ->first(fn (ApiKey $k) => Hash::check($key, $k->key_hash));

        if ($apiKey) {
            $apiKey->update(['last_used_at' => now()]);
        }

        return $apiKey;
    }

    public function revoke(ApiKey $apiKey): void
    {
        $apiKey->update(['revoked_at' => now()]);
    }
}
