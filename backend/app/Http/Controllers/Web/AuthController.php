<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(
        private AuditService $auditService,
    ) {}

    // === Email/Password Auth ===

    public function register(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email',
            'password' => 'required|string|min:6|confirmed',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'telegram_id' => 'email_' . $request->email,
            'role' => 'user',
        ]);

        $token = $user->createToken('auth-token')->plainTextToken;

        $this->auditService->log(
            userId: $user->id,
            action: 'create',
            targetType: 'user',
            targetId: $user->id,
            meta: ['name' => $request->name, 'email' => $request->email],
            request: $request,
        );

        return response()->json([
            'user' => $user,
            'token' => $token,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        $this->auditService->log(
            userId: $user->id,
            action: 'login',
            targetType: 'user',
            targetId: $user->id,
            request: $request,
        );

        return response()->json([
            'user' => $user,
            'token' => $token,
        ]);
    }

    // === Telegram OAuth ===

    public function redirect(): mixed
    {
        $botUsername = config('services.telegram.bot_username');
        $callback = route('auth.telegram.callback');

        return redirect("https://t.me/{$botUsername}?start=auth&redirect={$callback}");
    }

    public function callback(Request $request): mixed
    {
        $request->validate([
            'id' => 'required|string',
            'first_name' => 'required|string',
            'username' => 'nullable|string',
            'photo_url' => 'nullable|string',
            'auth_date' => 'required|string',
            'hash' => 'required|string',
        ]);

        // Verify Telegram hash
        $botToken = config('services.telegram.bot_token');
        $checkHash = $request->hash;

        $dataCheckArr = [];
        foreach ($request->except('hash') as $key => $value) {
            $dataCheckArr[] = "{$key}={$value}";
        }
        sort($dataCheckArr);
        $dataCheckString = implode("\n", $dataCheckArr);
        $secretKey = hash('sha256', $botToken, true);
        $hash = hash_hmac('sha256', $dataCheckString, $secretKey);

        if (!hash_equals($hash, $checkHash)) {
            Log::warning('Telegram OAuth hash verification failed', ['telegram_id' => $request->id]);
            return redirect(config('services.frontend_url') . '/login?error=invalid_hash');
        }

        $user = User::updateOrCreate(
            ['telegram_id' => $request->id],
            [
                'name' => $request->first_name,
                'username' => $request->username,
                'avatar_url' => $request->photo_url,
            ]
        );

        // Generate Sanctum token instead of session-based login
        $token = $user->createToken('auth-token')->plainTextToken;

        $this->auditService->log(
            userId: $user->id,
            action: 'login',
            targetType: 'user',
            targetId: $user->id,
            meta: ['method' => 'telegram_oauth'],
        );

        // Redirect to frontend with token as query param
        return redirect(config('services.frontend_url') . '/login?token=' . $token);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($request->user()->load('bots'));
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|string|email|max:255|unique:users,email,' . $user->id,
            'current_password' => 'required_with:password|string',
            'password' => 'sometimes|string|min:6|confirmed',
        ]);

        $updatedFields = [];

        if ($request->has('name')) {
            $user->name = $request->name;
            $updatedFields[] = 'name';
        }

        if ($request->has('email')) {
            $user->email = $request->email;
            $updatedFields[] = 'email';
        }

        if ($request->has('password')) {
            if (!Hash::check($request->current_password, $user->password)) {
                return response()->json([
                    'message' => 'Current password is incorrect.',
                    'errors' => ['current_password' => ['The current password you entered is incorrect.']],
                ], 422);
            }
            $user->password = Hash::make($request->password);
            $updatedFields[] = 'password';
        }

        $user->save();

        $this->auditService->log(
            userId: $user->id,
            action: 'update',
            targetType: 'user',
            targetId: $user->id,
            meta: ['updated_fields' => $updatedFields],
            request: $request,
        );

        return response()->json([
            'user' => $user->fresh(),
            'message' => 'Profile updated successfully.',
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(null, 204);
    }
}
