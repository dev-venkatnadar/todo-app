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
            ->assertJsonPath('title', 'Write API documentation')
            ->assertJsonPath('user_id', $assignee->id)
            ->assertJsonPath('created_by', $admin->id)
            ->assertJsonPath('status', Task::STATUS_PENDING)
            ->assertJsonPath('due_date', '2026-12-01');

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
            ->assertJsonPath('user_id', $admin->id)
            ->assertJsonPath('created_by', $admin->id)
            ->assertJsonPath('status', Task::STATUS_PENDING);
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

    public function test_regular_user_can_only_view_their_own_tasks_and_scoped_counts(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $ownPending = Task::factory()->create(['user_id' => $user->id, 'title' => 'My Task 1', 'status' => Task::STATUS_PENDING]);
        Task::factory()->create(['user_id' => $user->id, 'title' => 'My Task 2', 'status' => Task::STATUS_COMPLETED]);
        Task::factory()->create(['user_id' => $otherUser->id, 'title' => 'Other Task', 'status' => Task::STATUS_PENDING]);

        Sanctum::actingAs($user);

        // When requesting with a status filter, counts still reflect all user's tasks
        $indexResponse = $this->getJson('/api/tasks?status=pending');
        $indexResponse->assertOk()
            ->assertJsonCount(1, 'tasks.data')
            ->assertJsonPath('tasks.data.0.id', $ownPending->id)
            ->assertJsonPath('counts.total', 2)
            ->assertJsonPath('counts.pending', 1)
            ->assertJsonPath('counts.in_progress', 0)
            ->assertJsonPath('counts.completed', 1);

        $this->getJson('/api/tasks/'.$ownPending->id)
            ->assertOk()
            ->assertJsonPath('title', 'My Task 1');

        $this->getJson('/api/tasks/99999')
            ->assertNotFound();
    }

    public function test_admin_can_view_all_tasks_and_filter_by_user_or_status_with_global_counts(): void
    {
        $admin = User::factory()->admin()->create();
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        Task::factory()->create(['user_id' => $userA->id, 'status' => Task::STATUS_PENDING]);
        Task::factory()->create(['user_id' => $userA->id, 'status' => Task::STATUS_IN_PROGRESS]);
        Task::factory()->create(['user_id' => $userB->id, 'status' => Task::STATUS_COMPLETED]);

        Sanctum::actingAs($admin);

        // All tasks count
        $allResponse = $this->getJson('/api/tasks');
        $allResponse->assertOk()
            ->assertJsonCount(3, 'tasks.data')
            ->assertJsonPath('counts.total', 3)
            ->assertJsonPath('counts.pending', 1)
            ->assertJsonPath('counts.in_progress', 1)
            ->assertJsonPath('counts.completed', 1);

        // Admin filtered by user
        $userAResponse = $this->getJson('/api/tasks?user_id='.$userA->id);
        $userAResponse->assertOk()
            ->assertJsonCount(2, 'tasks.data')
            ->assertJsonPath('counts.total', 2)
            ->assertJsonPath('counts.pending', 1)
            ->assertJsonPath('counts.in_progress', 1)
            ->assertJsonPath('counts.completed', 0);

        // Admin filtered by status - counts still reflect all tasks for that scope
        $completedResponse = $this->getJson('/api/tasks?status='.Task::STATUS_COMPLETED);
        $completedResponse->assertOk()
            ->assertJsonCount(1, 'tasks.data')
            ->assertJsonPath('tasks.data.0.user_id', $userB->id)
            ->assertJsonPath('counts.total', 3)
            ->assertJsonPath('counts.completed', 1);
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
            ->assertJsonPath('status', Task::STATUS_COMPLETED)
            ->assertJsonPath('description', 'Done!');

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
