<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasUlids, HasApiTokens;

    protected $fillable = [
        'telegram_id',
        'email',
        'password',
        'name',
        'username',
        'avatar_url',
        'role',
    ];

    protected $hidden = [
        'password',
    ];

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function bots()
    {
        return $this->hasMany(Bot::class);
    }

    public function files()
    {
        return $this->hasMany(File::class);
    }

    public function folders()
    {
        return $this->hasMany(Folder::class);
    }

    public function apiKeys()
    {
        return $this->hasMany(ApiKey::class);
    }

    public function webhooks()
    {
        return $this->hasMany(Webhook::class);
    }

    public function auditLogs()
    {
        return $this->hasMany(AuditLog::class);
    }
}
