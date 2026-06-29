<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;

class Folder extends Model
{
    use HasUlids;

    protected $fillable = [
        'user_id',
        'bot_id',
        'name',
        'parent_id',
        'path',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function bot()
    {
        return $this->belongsTo(Bot::class);
    }

    public function parent()
    {
        return $this->belongsTo(Folder::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(Folder::class, 'parent_id');
    }

    public function files()
    {
        return $this->hasMany(File::class);
    }
}
