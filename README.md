# English_Coach_AI
Personal AI-powered English Learning Platform

## Repository structure

```text
english_coach/
├── backend/
│   ├── app/                 Flask application, API, models and configuration
│   ├── migrations/          Database migration scripts
│   ├── tests/               Backend tests
│   ├── config.py            Project-level configuration entry point
│   ├── requirements.txt
│   └── run.py               Flask application entry point
├── frontend/                React + Vite application
├── docker/                  Shared Docker notes and future tooling
├── nginx/                   Reserved for the production reverse proxy
├── .env.example             Local environment variable template
├── .gitignore
├── docker-compose.yml
└── README.md
```

Git is initialized for this repository. Copy `.env.example` to `.env` for local
configuration; `.env` files and secrets are excluded by `.gitignore`.

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

## AI learning endpoints

Connect an OpenAI API key from the frontend's connection control. The backend
stores it encrypted in its ignored `backend/instance/` directory. AI requests use
the Responses API with `store: false`; generated lessons, vocabulary, grammar,
exercises and conversation turns are saved to the local PostgreSQL database.

The default model is `gpt-5.4-mini`. Set `OPENAI_MODEL` in `.env` to change it.
Usage logs include model, response ID, input/output tokens and latency. Estimated
USD cost is included only after setting `OPENAI_INPUT_PRICE_PER_MILLION` and
`OPENAI_OUTPUT_PRICE_PER_MILLION` to current prices for the configured model.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/ai/lessons/generate` | Generate and save a lesson (`topic`, optional `goal`, `cefr_level`, `plan_id`) |
| POST | `/api/ai/vocabulary/generate` | Generate and save Georgian-translated vocabulary (`topic`, optional `count`, `cefr_level`) |
| POST | `/api/ai/grammar/explain` | Generate and save an explanation (`topic`, optional `cefr_level`) |
| POST | `/api/ai/exercises/generate` | Generate and save multiple-choice questions (`topic`, optional `count`, `cefr_level`, `grammar_topic_id`, `lesson_id`) |
| POST | `/api/ai/answers/evaluate` | Evaluate a response (`prompt`, `answer`, optional `expected_answer`, `cefr_level`) |
| POST | `/api/ai/conversations` | Start a roleplay (`scenario`, `message`, optional `cefr_level`) |
| POST | `/api/ai/conversations/{id}/messages` | Continue an active roleplay (`message`) |

Structured provider output is schema-checked before it is saved. Provider errors
are mapped to concise API errors; prompts, learner answers and API keys are not
written to usage logs.
