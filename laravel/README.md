# Headless Todo API (Laravel 9 + Sanctum + MySQL)

A headless REST API todo application built with Laravel 9, Laravel Sanctum token authentication, MySQL, and role-based access control (`admin` and `user`).

## Roles & Permissions

- **`admin`**:
  - Can create tasks (`POST /api/tasks`) and optionally assign them to any user via `user_id` (defaults to self if omitted).
  - Can view all tasks (`GET /api/tasks`, `GET /api/tasks/{id}`) with optional `user_id` and `status` filters.
  - Can update any task (`PUT/PATCH /api/tasks/{id}`), including reassigning `user_id`.
  - Can delete any task (`DELETE /api/tasks/{id}`).
- **`user`**:
  - Cannot create or delete tasks (`403 Forbidden`).
  - Can view only their own tasks (`GET /api/tasks`, `GET /api/tasks/{id}`).
  - Can update only their own tasks (`PUT/PATCH /api/tasks/{id}`), and cannot reassign `user_id`.

## Setup

1. Configure your MySQL connection in `.env`:
   ```env
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=laravel
   DB_USERNAME=root
   DB_PASSWORD=
   ```
2. Generate an application key (if not already set):
   ```bash
   php artisan key:generate
   ```
3. Run migrations and seed default accounts (`admin@example.com` / `password`, `user@example.com` / `password`):
   ```bash
   php artisan migrate --seed
   ```
4. Start the API server:
   ```bash
   php artisan serve
   ```

## API Endpoints

### Authentication
- `POST /api/register` — Register a new account (always assigned role `user`) and receive a Sanctum Bearer token.
  - Body: `{ "name": "Jane Doe", "email": "jane@example.com", "password": "password", "password_confirmation": "password" }`
- `POST /api/login` — Authenticate and receive a Sanctum Bearer token.
  - Body: `{ "email": "admin@example.com", "password": "password" }`
- `POST /api/logout` — Revoke the current Bearer token (`Authorization: Bearer <token>`).
- `GET /api/user` — Get the authenticated user profile (`Authorization: Bearer <token>`).

### Tasks (`Authorization: Bearer <token>`)
- `GET /api/tasks` — List tasks (optional `?status=pending|in_progress|completed`, and `?user_id=<id>` for admins).
- `POST /api/tasks` — Create a task (**admin only**).
  - Body: `{ "title": "Task title", "description": "Optional details", "status": "pending", "due_date": "2026-12-01", "user_id": 2 }`
- `GET /api/tasks/{id}` — View a specific task (admin or task owner).
- `PUT|PATCH /api/tasks/{id}` — Update a task (admin or task owner).
- `DELETE /api/tasks/{id}` — Delete a task (**admin only**).

## Running Tests

Tests run against an in-memory SQLite database configured in `phpunit.xml`:

```bash
php artisan test
```
