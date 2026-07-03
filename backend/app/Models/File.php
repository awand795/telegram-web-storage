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
        'parent_id',
        'chunk_index',
        'is_chunked',
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
            'is_chunked' => 'boolean',
            'chunk_index' => 'integer',
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

    /** Chunks belonging to this parent file */
    public function chunks()
    {
        return $this->hasMany(File::class, 'parent_id')->orderBy('chunk_index');
    }

    /** Parent file if this is a chunk */
    public function parent()
    {
        return $this->belongsTo(File::class, 'parent_id');
    }

    /**
     * Ensure uploaded_at is never null in JSON output.
     */
    public function toArray()
    {
        $data = parent::toArray();

        if (is_null($data['uploaded_at'])) {
            $data['uploaded_at'] = $this->created_at?->toIso8601String() ?? now()->toIso8601String();
        }

        return $data;
    }
}
