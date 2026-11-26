# Production deployment

1. Copy `.env.production.example` to `.env` and replace every placeholder. Set `APP_KEY` in `laravel/.env` (Laravel's environment file, read by the container). Generate a key with `printf 'base64:'; openssl rand -base64 32` and paste the result there. Keep `laravel/.env` private and out of source control.
2. Put the public React endpoint behind an HTTPS reverse proxy or load balancer, and set `APP_URL` to that public HTTPS URL. Set `HTTP_PORT` to the private port where that proxy reaches this stack.
3. Build and start the services with `docker compose up -d --build`. Compose runs `php artisan migrate --force` in a one-shot service after MySQL becomes healthy, and starts Laravel only after migrations succeed. If migration fails, Laravel stays stopped and the migration service logs the failure.

MySQL has no published host port and is reachable only on the internal backend network. phpMyAdmin is excluded from the normal stack; start it when needed with `docker compose --profile admin up -d phpmyadmin`. Its port binds to `127.0.0.1`, so connect from a remote machine through an SSH tunnel.
