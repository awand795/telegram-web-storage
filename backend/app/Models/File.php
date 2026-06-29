<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;

class File extends Model
{
    use HasUlids;

    protected $fillable = [
        'bot_id',
        'user_id',
        'telegram_file_id',
        'message_id',
        'name',
        'size',
        'mime_type',
        'folder_id',
        'temp_path',
        'tags',
        'status',
        'uploaded_at',
    ];

    protected function casts(): array
    {
        return [
            'size' => 'integer',
            'tags' => 'array',
            'uploaded_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function bot()
    {
        return $this->belongsTo(Bot::class);
    }

    public function folder()
    {
        return $this->belongsTo(Folder::class);
    }
}
