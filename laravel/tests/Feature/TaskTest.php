<?php

namespace Tests\Feature;

use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TaskTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_task_assigned_to_a_user(): void
    {
        $admin = User::factory()->admin()->create();
        $assignee = User::factory()->create();

        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/tasks', [
            'title' => 'Write API documentation',
            'description' => 'Document all Sanctum and task endpoints',
            'status' => Task::STATUS_PENDING,
            'due_date' => '2026-12-01',
            'user_id' => $assignee->id,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.title', 'Write API documentation')
            ->assertJsonPath('data.user_id', $assignee->id)
            ->assertJsonPath('data.created_by', $admin->id)
            ->assertJsonPath('data.status', Task::STATUS_PENDING)
            ->assertJsonPath('data.due_date', '2026-12-01');

        $this->assertDatabaseHas('tasks', [
            'title' => 'Write API documentation',
            'user_id' => $assignee->id,
            'created_by' => $admin->id,
        ]);
    }

    public function test_admin_can_create_task_for_self_when_user_id_is_omitted(): void
    {
        $admin = User::factory()->admin()->create();
        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/tasks', [
            'title' => 'Admin personal task',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.user_id', $admin->id)
            ->assertJsonPath('data.created_by', $admin->id)
            ->assertJsonPath('data.status', Task::STATUS_PENDING);
    }

    public function test_regular_user_cannot_create_task(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/tasks', [
            'title' => 'Unauthorized task',
        ]);

        $response->assertForbidden();
        $this->assertDatabaseCount('tasks', 0);
    }

    public function test_regular_user_can_only_view_their_own_tasks(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $ownTask = Task::factory()->create(['user_id' => $user->id, 'title' => 'My Task']);
        $otherTask = Task::factory()->create(['user_id' => $otherUser->id, 'title' => 'Other Task']);

        Sanctum::actingAs($user);

        $indexResponse = $this->getJson('/api/tasks');
        $indexResponse->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $ownTask->id);

        $this->getJson('/api/tasks/'.$ownTask->id)
            ->assertOk()
            ->assertJsonPath('data.title', 'My Task');

        $this->getJson('/api/tasks/'.$otherTask->id)
            ->assertForbidden();
    }

    public function test_admin_can_view_all_tasks_and_filter_by_user_or_status(): void
    {
        $admin = User::factory()->admin()->create();
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        Task::factory()->create(['user_id' => $userA->id, 'status' => Task::STATUS_PENDING]);
        Task::factory()->create(['user_id' => $userB->id, 'status' => Task::STATUS_COMPLETED]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/tasks')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->getJson('/api/tasks?user_id='.$userA->id)
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.user_id', $userA->id);

        $this->getJson('/api/tasks?status='.Task::STATUS_COMPLETED)
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.user_id', $userB->id);
    }

    public function test_regular_user_can_update_their_own_task_but_not_reassign_or_update_others(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $ownTask = Task::factory()->create([
            'user_id' => $user->id,
            'status' => Task::STATUS_PENDING,
        ]);
        $otherTask = Task::factory()->create([
            'user_id' => $otherUser->id,
            'status' => Task::STATUS_PENDING,
        ]);

        Sanctum::actingAs($user);

        $this->patchJson('/api/tasks/'.$ownTask->id, [
            'status' => Task::STATUS_COMPLETED,
            'description' => 'Done!',
        ])->assertOk()
            ->assertJsonPath('data.status', Task::STATUS_COMPLETED)
            ->assertJsonPath('data.description', 'Done!');

        $this->patchJson('/api/tasks/'.$ownTask->id, [
            'user_id' => $otherUser->id,
        ])->assertForbidden();

        $this->patchJson('/api/tasks/'.$otherTask->id, [
            'status' => Task::STATUS_COMPLETED,
        ])->assertForbidden();
    }

    public function test_only_admin_can_delete_tasks(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create();
        $task = Task::factory()->create(['user_id' => $user->id, 'created_by' => $admin->id]);

        Sanctum::actingAs($user);
        $this->deleteJson('/api/tasks/'.$task->id)->assertForbidden();
        $this->assertDatabaseHas('tasks', ['id' => $task->id]);

        Sanctum::actingAs($admin);
        $this->deleteJson('/api/tasks/'.$task->id)->assertOk();
        $this->assertDatabaseMissing('tasks', ['id' => $task->id]);
    }

    public function test_task_validation_errors(): void
    {
        $admin = User::factory()->admin()->create();
        Sanctum::actingAs($admin);

        $this->postJson('/api/tasks', [
            'title' => '',
            'status' => 'invalid_status',
            'due_date' => 'not-a-date',
            'user_id' => 999999,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['title', 'status', 'due_date', 'user_id']);
    }
}
