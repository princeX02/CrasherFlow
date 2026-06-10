# CrusherFlow — Local backend (SQLite)

This workspace includes a minimal Node.js backend (PostgreSQL) that serves a small REST API for vehicles and trips. It is intentionally lightweight so you can run it locally and connect the frontend later.

Dependency manifest

- `package.json` and `package-lock.json` are the real install files for this project.
- `requirements.txt` is included as a human-readable download/install checklist.

Setup

1. Install dependencies:

```bash
cd /Users/princechaudhary/Desktop/te
npm install
```

2. Start a PostgreSQL instance (local Docker Compose example included):

```bash
docker compose up -d
export DB_TYPE=pg
export DATABASE_URL="postgres://crusher:crusherpass@localhost:5432/crusherflow"
```

If you run the app through `docker compose` instead of directly on your machine, use the service hostname `db` in `DATABASE_URL`:

```bash
DATABASE_URL="postgres://crusher:crusherpass@db:5432/crusherflow"
```

3. Initialize the database schema and seed data:

```bash
npm run init-db
```

4. Start the server:

```bash
npm start
```

The API will be available at `http://localhost:3000/api/`.

Endpoints

- `GET /api/ping` — health
- `GET /api/vehicles` — list vehicles
- `POST /api/vehicles` — add vehicle (json: `{num,driver,type,phone}`)
- `DELETE /api/vehicles/:id` — remove vehicle
- `GET /api/trips` — list trips
- `POST /api/trips` — add trip (json with required fields)
- `DELETE /api/trips/:id` — remove trip
- `GET /api/export.csv` — download CSV export
 - `GET /api/export.csv` — download CSV export (admin only)

Next step: I can wire the frontend (`crusher_transport.html`) to use these endpoints (fetch) instead of localStorage. Want me to implement that now?

Production checklist & hardening
--------------------------------
Before deploying to production, consider the following checklist which this repo now begins to address:

- Use a managed Postgres instance (Neon, RDS, Azure DB) and never commit credentials to the repo.
- Set `DATABASE_URL` in the Render (or host) env, not in source. Add a secret to the platform.
- Run `npm ci` and use the `start:prod` script to start in production mode.
- Monitor logs and set an appropriate `LOG_LEVEL` (default: `info`).
- Consider automated backups for your DB and a reliable monitoring/alerting system.
- Rotate credentials and use least-privilege DB roles (avoid superuser in production).

What's added in this repo to help harden the app:

- `helmet` for basic HTTP header security
- `express-rate-limit` to limit abusive requests
- `winston` for structured logging
- Health endpoints: `/healthz` and `/ready`
- Graceful shutdown handling for `SIGINT`/`SIGTERM`
- A multi-stage `Dockerfile` that runs the app as an unprivileged user and includes a `HEALTHCHECK`
- `render.yaml` to deploy on Render and a recommended free DB path (Neon)
- A simple GitHub Actions CI that installs dependencies and verifies runtime availability

Follow these next: provision Neon, add the `DATABASE_URL` to Render, and deploy (or provide Render API key and I can do it for you).
Database

This project now uses PostgreSQL by default. If you prefer a different provider, set `DATABASE_URL` to point at your Postgres instance.

Examples (local Docker Compose):

```bash
docker compose up -d
export DATABASE_URL="postgres://crusher:crusherpass@localhost:5432/crusherflow"
npm run init-db
npm start
```
 
Run Postgres locally with Docker Compose
--------------------------------------
If you don't have a Postgres server handy, you can run one locally using the included `docker-compose.yml`:

```bash
# start Postgres container (detached)
docker compose up -d

# start the app container too
docker compose up -d app

# (optional) view logs
docker compose logs -f db

# use the example credentials from .env.example:
export DB_TYPE=pg
export DATABASE_URL="postgres://crusher:crusherpass@localhost:5432/crusherflow"

# initialize schema + seeds in Postgres
npm run init-db

# start the app
npm start
```

You can customize credentials by editing the `docker-compose.yml` environment variables or by providing your own `DATABASE_URL`.

When running the app inside Docker Compose, the database host must be `db`, not `localhost`.

Security note: for production do not use the example passwords; instead provision a managed Postgres service or secure the container behind a private network.

Render free deployment
----------------------

This project includes `render.yaml` so you can deploy the Docker image to a Render free web service.

Important: Render's free web service is suitable for the app, but its managed Postgres offering may not be free. For a free database, use an external free PostgreSQL provider such as Neon or Supabase and paste the connection string into `DATABASE_URL`.

Recommended free database path: Neon

1. Create a free Neon project.
2. Copy the PostgreSQL connection string from Neon.
3. Add `sslmode=require` if it is not already included.
4. Paste that string into the Render service environment variable `DATABASE_URL`.

Steps:

1. Push this repo to GitHub.
2. In Render, create a new Blueprint from the repository and select `render.yaml`.
3. Create a free PostgreSQL database from Neon or Supabase and copy its connection string.
4. Add the connection string as the `DATABASE_URL` environment variable in Render.
5. Deploy the service and check `GET /api/ping`.

Admin bootstrap
----------------
To create an initial admin user for the deployed environment, run the included script with environment variables set:

```bash
ADMIN_USER=admin ADMIN_PASS=yourpassword DATABASE_URL="$DATABASE_URL" node scripts/create_admin.js
```

This creates a user with role `admin` (used to access the CSV export and other admin-only actions).

Example Render `DATABASE_URL` format for Neon:

```text
postgres://<user>:<password>@<host>/<dbname>?sslmode=require
```

If you want to keep using Docker locally, this app still works with the included `docker-compose.yml` and `Dockerfile`.
