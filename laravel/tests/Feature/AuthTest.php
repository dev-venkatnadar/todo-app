<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_and_receives_sanctum_token_with_default_user_role(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Jane Doe',
            'email' => 'jane@example.com',
            'password' => 'secret1234',
            'password_confirmation' => 'secret1234',
            'role' => User::ROLE_ADMIN, // Should be ignored; public registration always assigns "user".
        ]);

        $response->assertCreated()
            ->assertJsonStructure([
                'message',
                'user' => ['id', 'name', 'email', 'role', 'created_at', 'updated_at'],
                'token',
                'token_type',
            ])
            ->assertJsonPath('user.email', 'jane@example.com')
            ->assertJsonPath('user.role', User::ROLE_USER)
            ->assertJsonPath('token_type', 'Bearer');

        $this->assertDatabaseHas('users', [
            'email' => 'jane@example.com',
            'role' => User::ROLE_USER,
        ]);
    }

    public function test_registration_requires_valid_unique_fields(): void
    {
        User::factory()->create(['email' => 'taken@example.com']);

        $response = $this->postJson('/api/register', [
            'name' => '',
            'email' => 'taken@example.com',
            'password' => 'short',
            'password_confirmation' => 'mismatch',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'email', 'password']);
    }

    public function test_user_can_login_with_valid_credentials_and_access_protected_routes(): void
    {
        $user = User::factory()->create([
            'email' => 'john@example.com',
            'password' => Hash::make('secret1234'),
            'role' => User::ROLE_USER,
        ]);

        $loginResponse = $this->postJson('/api/login', [
            'email' => 'john@example.com',
            'password' => 'secret1234',
            'device_name' => 'cli-test',
        ]);

        $loginResponse->assertOk()
            ->assertJsonPath('user.id', $user->id)
            ->assertJsonPath('user.role', User::ROLE_USER)
            ->assertJsonStructure(['token', 'token_type']);

        $token = $loginResponse->json('token');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('user.email', 'john@example.com');
    }

    public function test_login_fails_with_invalid_credentials(): void
    {
        User::factory()->create([
            'email' => 'john@example.com',
            'password' => Hash::make('secret1234'),
        ]);

        $this->postJson('/api/login', [
            'email' => 'john@example.com',
            'password' => 'wrong-password',
        ])->assertUnauthorized();
    }

    public function test_user_can_logout_and_revoke_current_token(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test-device')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/logout')
            ->assertOk();

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_unauthenticated_api_request_returns_json_without_accept_header(): void
    {
        $response = $this->get('/api/tasks');

        $response->assertUnauthorized()
            ->assertHeader('Content-Type', 'application/json');
    }
}
