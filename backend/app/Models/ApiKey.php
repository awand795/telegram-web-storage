<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;

class ApiKey extends Model
{
    use HasUlids;

    protected $fillable = [
        'user_id',
        'name',
        'key_hash',
        'key_preview',
        'last_used_at',
        'revoked_at',
        'rate_limit',
    ];

    protected $hidden = [
        'key_hash',
    ];

    protected function casts(): array
    {
        return [
            'rate_limit' => 'integer',
            'last_used_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function isValid(): bool
    {
        return $this->revoked_at === null;
    }
}
