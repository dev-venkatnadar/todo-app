# Todo Dashboard
 
A task management application with a React dashboard, a Laravel REST API, and MySQL. The root Docker Compose stack runs the complete application and serves the frontend and API from one origin.

## Applications

| Directory | Application | Stack |
| --- | --- | --- |
| `react/` | Dashboard UI | React 18, Vite, Nginx |
| `laravel/` | REST API and authentication | Laravel 9, Sanctum, PHP 8.2, Apache |
| `docker-compose.yaml` | Full deployment | React, Laravel, MySQL 8.4; optional phpMyAdmin |

The `ai-agent/` directory currently contains no tracked application source, so there is no separate AI service to run or deploy yet.

<img width="1912" height="1018" alt="image" src="https://github.com/user-attachments/assets/a88e54f5-5bfc-4e22-9cb6-6ce0c52f948b" />

## Features

- Bearer-token login, registration, and logout.
- Task list, filtering, pagination, status counts, and task updates.
- Admin and regular-user roles. Admins can create/delete tasks and manage all tasks; regular users work with their own tasks.
- A seeded admin account, regular account, and sample task for local development.

## Run the complete stack with Docker Compose

Requirements: Docker Engine and the Docker Compose plugin.

1. Create the Compose environment file and set strong database passwords:

   ```bash
   cp .env.production.example .env
   ```

   Edit `.env`. Set `APP_URL` to the URL people will use and `HTTP_PORT` to the local port on which the frontend should listen. Replace all example passwords before deploying.

2. Create Laravel's environment file and generate its application key:

   ```bash
   cp laravel/.env.example laravel/.env
   php -r 'echo "base64:", base64_encode(random_bytes(32)), PHP_EOL;'
   ```

   Copy the generated `base64:...` value into `APP_KEY` in `laravel/.env`. Keep both `.env` files private. The Compose deployment supplies the database connection and production settings to the Laravel containers.

3. Build and start the app:

   ```bash
   docker compose up -d --build
   ```

   Open `http://localhost` (or the configured `HTTP_PORT`). Compose waits for MySQL, runs migrations and the database seeder once, then starts the API and frontend. The MySQL data is stored in the `mysql_data` named volume.

Useful operations:

```bash
docker compose ps                         # service status and health
docker compose logs -f                    # follow all logs
docker compose logs -f laravel migrate    # API and migration logs
docker compose down                      # stop and remove containers/networks
docker compose down -v                    # also delete the database volume/data
```

To rebuild after code or configuration changes, run `docker compose up -d --build` again. The migration service runs on each stack start; Laravel migrations are designed to be repeatable. Seeding creates the demo users and one sample task only when there are no tasks.

### Optional database administration

phpMyAdmin is not part of the default stack. Start it only when needed:

```bash
docker compose --profile admin up -d phpmyadmin
```

It binds to `127.0.0.1:8080` by default (change with `PHPMYADMIN_PORT` in root `.env`). Log in with the MySQL username and password from that file. Since it is loopback-only, use an SSH tunnel to access it remotely. Stop it with `docker compose --profile admin stop phpmyadmin`.

### Production deployment

Use a Linux host or container platform with Docker Compose. Copy `.env.production.example` to `.env`, set unique strong database passwords, set `APP_URL` to the public HTTPS URL, and set `HTTP_PORT` to the port your HTTPS reverse proxy can reach. Set a persistent and private `APP_KEY` in `laravel/.env` as described above. Keep `APP_DEBUG=false` in production; the Compose service sets this automatically.

Run `docker compose up -d --build` to deploy. Put a TLS reverse proxy or load balancer in front of the React service. The frontend Nginx serves the static app and proxies `/api/` to Laravel, so browser traffic can use the same public origin. MySQL is not published on a host port and is attached only to Compose's internal backend network. Back up the `mysql_data` volume and retain the `APP_KEY`; changing or losing the key invalidates existing encrypted Laravel data and sessions.

## Run services individually for development

The steps below run Laravel/MySQL and React directly on the host. You need PHP 8.2 with the PDO MySQL extension, Composer, Node.js 20 or newer, npm, and a reachable MySQL server.

### 1. Start the Laravel API

```bash
cd laravel
cp .env.example .env
composer install
php artisan key:generate
```

Edit `laravel/.env` and set `APP_URL`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, and `DB_PASSWORD` for your local MySQL. Create the database and run its migrations and demo seeder:

```bash
php artisan migrate --seed
php artisan serve --host 0.0.0.0 --port 8000
```

The API is then available at `http://localhost:8000/api`. For local development, Laravel's default CORS configuration permits requests from the React development server. Do not use demo passwords for a public deployment.

### 2. Start the React dashboard

In another terminal:

```bash
cd react
npm ci
npm run dev -- --host 0.0.0.0
```

Open the Vite URL (usually `http://localhost:5173`). By default, this development build calls `http://localhost:8000/api`. To point it at another API, set `VITE_API_BASE_URL` before starting/building React, for example:

```bash
VITE_API_BASE_URL=https://api.example.com/api npm run dev
```

The dashboard also lets a user override the API URL in the app; that override is saved in browser local storage.

## Build and deploy the frontend separately

```bash
cd react
npm ci
VITE_API_BASE_URL=https://api.example.com/api npm run build
```

Publish the generated `react/dist/` directory to any static web host. Configure the host to serve `index.html` for unknown paths so client-side routes work. Configure Laravel CORS to allow the deployed frontend origin if it is on a different domain. For a same-origin deployment, set `VITE_API_BASE_URL=/api` and configure the web server to proxy `/api/` to Laravel, as the included Nginx config does in Docker.

## API and authentication

All API routes are under `/api`:

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/register` | Register a regular user and receive a token |
| `POST` | `/login` | Sign in and receive a token |
| `POST` | `/logout` | Revoke the current token (authenticated) |
| `GET` | `/user` | Current user profile (authenticated) |
| `GET` | `/tasks` | List tasks and status counts (authenticated) |
| `POST` | `/tasks` | Create task (admin only) |
| `GET` | `/tasks/{id}` | Read a task (admin or owner) |
| `PUT`, `PATCH` | `/tasks/{id}` | Update a task (admin or owner) |
| `DELETE` | `/tasks/{id}` | Delete task (admin only) |

Send the login/register token on protected requests as `Authorization: Bearer <token>`. The task list accepts `status`, `page`, and `per_page`; admins can also filter with `user_id`. Full request and response details are in [`laravel/README.md`](laravel/README.md), and a Postman collection is available at [`laravel/postman_collection.json`](laravel/postman_collection.json).

### Seeded development accounts

The initial database seeder creates:

- Admin: `admin@example.com` / `password`
- User: `user@example.com` / `password`

These credentials are public in the source and are for local/demo use only. Change or remove them before exposing a deployment to users.

## Run backend tests

From the Laravel directory:

```bash
cd laravel
php artisan test
```

The PHPUnit configuration uses an in-memory SQLite database.
