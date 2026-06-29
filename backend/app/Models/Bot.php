<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;

class Bot extends Model
{
    use HasUlids;

    protected $fillable = [
        'user_id',
        'name',
        'token_encrypted',
        'token_preview',
        'chat_id',
        'active',
    ];

    protected $hidden = [
        'token_encrypted',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'token_encrypted' => 'encrypted',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function files()
    {
        return $this->hasMany(File::class);
    }

    public function folders()
    {
        return $this->hasMany(Folder::class);
    }
}
