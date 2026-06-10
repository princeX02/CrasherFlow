# CrusherFlow — Local backend (SQLite)

This workspace includes a minimal Node.js backend (PostgreSQL) that serves a small REST API for vehicles and trips. It is intentionally lightweight so you can run it locally and connect the frontend later.

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

Next step: I can wire the frontend (`crusher_transport.html`) to use these endpoints (fetch) instead of localStorage. Want me to implement that now?

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

Security note: for production do not use the example passwords; instead provision a managed Postgres service or secure the container behind a private network.
