<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class TaskController extends Controller
{
    /**
     * List tasks. Admins see all tasks; users see only their own tasks.
     * Also returns overall counts for each status (pending, in_progress, completed, total)
     * scoped to the user (or all tasks for admin).
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Task::class);

        $user = $request->user();

        // Base query for counts (scoped by ownership or admin filter, without status filter)
        $countsQuery = Task::query();
        if (! $user->isAdmin()) {
            $countsQuery->where('user_id', $user->id);
        } elseif ($request->filled('user_id')) {
            $countsQuery->where('user_id', (int) $request->query('user_id'));
        }

        // Aggregate counts per status across all accessible tasks
        $rawCounts = (clone $countsQuery)
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status')
            ->all();

        $counts = [
            'total' => array_sum($rawCounts),
            'pending' => (int) ($rawCounts[Task::STATUS_PENDING] ?? 0),
            'in_progress' => (int) ($rawCounts[Task::STATUS_IN_PROGRESS] ?? 0),
            'completed' => (int) ($rawCounts[Task::STATUS_COMPLETED] ?? 0),
        ];

        // Query for the paginated listing
        $query = (clone $countsQuery)->with(['user', 'creator'])->latest('id');

        if ($request->filled('status') && in_array($request->query('status'), Task::STATUSES, true)) {
            $query->where('status', $request->query('status'));
        }

        $perPage = max(1, min((int) $request->query('per_page', 15), 100));
        $paginated = $query->paginate($perPage);

        return response()->json([
            'counts' => $counts,
            'tasks' => $paginated,
        ]);
    }

    /**
     * Create a new task (admin only).
     */
    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Task::class);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['sometimes', 'string', Rule::in(Task::STATUSES)],
            'due_date' => ['nullable', 'date_format:Y-m-d'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $admin = $request->user();

        $task = Task::create([
            'user_id' => $validated['user_id'] ?? $admin->id,
            'created_by' => $admin->id,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'] ?? Task::STATUS_PENDING,
            'due_date' => $validated['due_date'] ?? null,
        ]);

        $task->load(['user', 'creator']);

        return response()->json($task, Response::HTTP_CREATED);
    }

    /**
     * Show a single task (admin or task owner).
     */
    public function show(Task $task): Task
    {
        $this->authorize('view', $task);

        $task->load(['user', 'creator']);

        return $task;
    }

    /**
     * Update a task (admin or task owner; only admin can reassign user_id).
     */
    public function update(Request $request, Task $task): Task
    {
        $this->authorize('update', $task);

        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['sometimes', 'required', 'string', Rule::in(Task::STATUSES)],
            'due_date' => ['nullable', 'date_format:Y-m-d'],
            'user_id' => ['sometimes', 'integer', 'exists:users,id'],
        ]);

        $user = $request->user();

        if (! $user->isAdmin() && array_key_exists('user_id', $validated) && (int) $validated['user_id'] !== $task->user_id) {
            abort(Response::HTTP_FORBIDDEN, 'Only admins can reassign tasks.');
        }

        $task->update($validated);
        $task->load(['user', 'creator']);

        return $task;
    }

    /**
     * Delete a task (admin only).
     */
    public function destroy(Task $task): JsonResponse
    {
        $this->authorize('delete', $task);

        $task->delete();

        return response()->json([
            'message' => 'Task deleted successfully.',
        ]);
    }
}
