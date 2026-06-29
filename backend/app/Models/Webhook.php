<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;

class Webhook extends Model
{
    use HasUlids;

    protected $fillable = [
        'user_id',
        'url',
        'secret_encrypted',
        'events',
        'active',
    ];

    protected $hidden = [
        'secret_encrypted',
    ];

    protected function casts(): array
    {
        return [
            'events' => 'array',
            'active' => 'boolean',
            'secret_encrypted' => 'encrypted',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
