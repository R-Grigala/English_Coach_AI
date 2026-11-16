# English_Coach_AI
Personal AI-powered English Learning Platform

## Backend

The Flask API lives in [`backend/`](./backend/). See [`backend/README.md`](./backend/README.md)
for local setup, database migrations, and API endpoints.

## Run the full development environment

Install Docker with the Compose plugin, copy `.env.example` to `.env`, then run:

```bash
docker compose up --build
```

Open the Vite app at `http://localhost:5173` and the Flask API docs at
`http://localhost:5000/api/docs`. PostgreSQL and Redis persist their data in named
Docker volumes and their ports are bound to localhost only. PostgreSQL is available
from the host at `127.0.0.1:5433` (container port `5432`). Stop the stack with
`docker compose down`; use `docker compose down -v` only when you intend to remove
the persisted database and Redis data.

The frontend proxies `/api` requests to Flask inside the Compose network. The
backend uses PostgreSQL and Redis service names for container-to-container access.
