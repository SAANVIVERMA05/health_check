# PulseCheck

PulseCheck is a full-stack stress monitoring and recommendation system. It turns a short daily wellness check-in into a transparent stress score, contributing factors, practical recommendations, and a trend over time.

## Stack

- **Frontend:** React + Vite, Lucide icons, responsive CSS dashboard
- **Backend:** FastAPI, Pydantic validation, SQLAlchemy
- **Database:** PostgreSQL 16
- **Deployment:** Dockerfiles for the API and static frontend, Docker Compose for local PostgreSQL

## Run locally

Prerequisites: Python 3.12+, Node 20+, npm, and Docker.

1. Start PostgreSQL:

   ```bash
   cp .env.example .env
   # Replace the YOUR_* values in .env with local values.
   docker compose up -d db
   ```

2. Start the API:

   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8000
   ```

   API documentation is available at `http://localhost:8000/docs`.

3. Start the frontend in a second terminal:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

   Open `http://localhost:5173`. The client loads and saves data only through the API; there is no seeded or fallback demo data.

### Environment configuration

Copy `.env.example` to `.env` for local configuration, or copy `frontend/.env.example` to `frontend/.env` when configuring the client separately. `.env` is ignored by git and must never be committed. Set `VITE_API_URL` to the deployed API base URL, including `/api`, before running `npm run build`. Set `DATABASE_URL` in the backend process environment.

## API

### `GET /api/health`

Returns `{ "status": "ok" }`.

### `GET /api/users/{email}/dashboard`

Returns the user profile, the latest assessment, and all previous assessments ordered newest first. Returns `404` when an email has no profile.

### `POST /api/assessments`

Accepts a JSON body like:

```json
{
  "name": "Alex Morgan",
  "email": "alex@example.com",
  "sleep_duration": 7.2,
  "work_hours": 8,
  "mood_level": 7,
  "screen_time": 5.2,
  "physical_activity": 45,
  "heart_rate": 74,
  "blood_oxygen": 98
}
```

The endpoint creates a profile if the email is new, otherwise updates the name and appends a new assessment. All numeric inputs are constrained by Pydantic validation before business logic runs.

## Assessment logic

The score starts at zero. Each signal adds points when it crosses a stress-risk threshold:

| Signal | Trigger | Points |
| --- | --- | ---: |
| Sleep | Less than 7 hours | 20 |
| Work | More than 9 hours | 15 |
| Mood | 4 or below | 20 |
| Screen time | More than 7 hours | 15 |
| Physical activity | Less than 30 minutes | 15 |
| Resting heart rate | More than 90 bpm | 10 |
| Blood oxygen | Less than 95% | 10 |

Levels are **Low** below 30, **Medium** from 30 through 59, and **High** at 60 or above. Each triggered rule contributes a plain-language factor and recommendation. This is a wellness heuristic, not a medical diagnosis; the UI makes that boundary explicit.

## Database schema

`users` stores the unique email profile and creation date. `assessments` stores every submitted lifestyle snapshot, its calculated score and level, generated summary, serialized factors, recommendations, and timestamp. The `user_id` foreign key cascades when a profile is removed. SQLAlchemy creates the tables on API startup; the equivalent SQL is also available in `backend/schema.sql`.

## Architecture

```text
React check-in form
        |
        | POST /api/assessments
        v
FastAPI validation -> scoring rules -> SQLAlchemy
        |                              |
        | GET dashboard                v
        +------------------------- PostgreSQL
```

The frontend uses `VITE_API_URL` when supplied and defaults to `http://localhost:8000/api`. This makes the same bundle usable with a hosted API:

```bash
VITE_API_URL=https://your-api.example.com/api npm run build
```

## Deployment

For a simple hosted setup, deploy PostgreSQL through a managed provider, set `DATABASE_URL` on a Python container platform, and deploy `backend/Dockerfile` with the command already included. Deploy `frontend/Dockerfile` to a static/container host with `VITE_API_URL` set at build time. FastAPI exposes OpenAPI documentation automatically at `/docs` and `/redoc`.

Before production, restrict `allow_origins` in `backend/app/main.py` to the exact frontend domain, add authentication, and encrypt or minimize health data according to the deployment's privacy requirements.

## Voice assistant add-on

The dashboard is structured for a voice layer: browser `SpeechRecognition` can map commands such as “check my stress level” to the latest dashboard state, while `speechSynthesis` can read the summary and recommendations. It is intentionally left as an opt-in enhancement so the core workflow works without browser-specific speech permissions.
# health_check