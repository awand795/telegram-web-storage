<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditService
{
    public function log(
        string $userId,
        string $action,
        string $targetType,
        ?string $targetId = null,
        ?array $meta = null,
        ?Request $request = null,
    ): AuditLog {
        $data = [
            'user_id' => $userId,
            'action' => $action,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'meta' => $meta,
        ];

        if ($request) {
            $data['ip'] = $request->ip();
            $data['user_agent'] = $request->userAgent();
        }

        return AuditLog::create($data);
    }
}
