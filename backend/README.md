# English Coach AI Backend

Flask REST API foundation for a personal, single-user learning installation. It has
PostgreSQL support, SQLAlchemy models, Flask-Migrate, and interactive API documentation;
it does not require accounts or login.

## Local setup

Requires Python 3.11+ and PostgreSQL for the intended development setup. SQLite is
used automatically when `DATABASE_URL` is not set.

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Configure `DATABASE_URL` for your PostgreSQL instance. For a private personal setup,
keep the API reachable only from your own machine or trusted local network.

Create and apply the first schema migration, then run the API:

```bash
flask db init
flask db migrate -m "create learning profile table"
flask db upgrade
flask run
```

The API listens on `http://127.0.0.1:5000`. Swagger documentation is available at
`/api/docs`; the database-backed health endpoint is `/api/health/`.

## Initial endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/profile` | Read the local learning profile (creates defaults on first access) |
| `PUT` | `/api/profile` | Update the local learning profile |
| `GET` | `/api/health/` | Check API and database availability |

The profile accepts `display_name`, `cefr_level` (`A1` through `C2`),
`native_language`, and `learning_goal`. No credentials or authorization headers
are required.
