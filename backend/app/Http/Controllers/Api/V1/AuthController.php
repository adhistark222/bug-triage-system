<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Login endpoint: issue a Sanctum token.
     *
     * @return JsonResponse { data: { token: string } }
     *
     * @throws ValidationException on invalid credentials
     */
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $credentials['email'])->first();

        // Never reveal whether the email exists (prevent user enumeration)
        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            return response()->json(
                ['message' => 'Invalid credentials.'],
                401
            );
        }

        // Issue a Sanctum token
        $token = $user->createToken('api')->plainTextToken;

        return response()->json(
            ['data' => ['token' => $token]],
            200
        );
    }

    /**
     * Logout endpoint: revoke the token.
     *
     * @return JsonResponse { message: string }
     */
    public function logout(Request $request): JsonResponse
    {
            // Revoke the current access token
            $request->user()?->currentAccessToken()?->delete();

        // Also clear potential stateful guard/session authentication.
        Auth::guard('web')->logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        // Reset resolved guards so subsequent requests must re-authenticate.
        app('auth')->forgetGuards();

        return response()->json(
            ['message' => 'Logged out successfully.'],
            200
        );
    }
}
