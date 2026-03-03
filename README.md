# Workout Tracker

A small API + web app for tracking workouts: register, log in, and log workouts with type, duration, heart rate, and calories. Workouts are scoped to the logged-in user.

## Tech stack

- **Backend:** FastAPI, SQLModel (SQLite), Alembic, JWT auth, Argon2 passwords
- **Frontend:** Vanilla HTML, CSS, and JavaScript (no framework)

## Project structure

```
tiny-api/
├── app/
│   ├── main.py           # FastAPI app, mounts routers and static frontend
│   ├── core/
│   │   ├── config.py     # Settings (env, secret key, DB URL)
│   │   └── security.py   # Password hashing, JWT, get_current_user
│   ├── db/
│   │   ├── database.py   # Engine, create_db_and_tables, get_session
│   │   └── models.py     # User, PasswordResetToken, Workout
│   ├── schemas/
│   │   ├── user.py       # UserCreate, UserRead, Token, forgot/reset
│   │   └── workout.py    # WorkoutCreate, WorkoutRead, WorkoutUpdate
│   └── routers/
│       ├── auth.py       # register, login, me, forgot-password, reset-password
│       ├── users.py      # list users, me, get user by id
│       └── workouts.py   # CRUD workouts (user-scoped)
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── alembic/              # Migrations
├── database.db           # SQLite (created at runtime)
├── Procfile              # Elastic Beanstalk: uvicorn start command
├── requirements.txt
├── .env                  # Optional: SECRET_KEY, etc.
└── README.md
```

## Setup

1. **Clone or open the project** and go to the project root.

2. **Create a virtual environment and install dependencies:**

   ```bash
   python3 -m venv .venv
   source .venv/bin/activate   # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Optional: set environment variables** in a `.env` file at the project root:

   ```env
   SECRET_KEY=your-long-random-secret   # e.g. from: openssl rand -hex 32
   ```

   If you don’t set `SECRET_KEY`, the app uses a default (fine for local dev only).

4. **Run migrations** (if you use Alembic and have existing migrations):

   ```bash
   alembic upgrade head
   ```

   If the DB is new, the app also creates tables on startup via `create_db_and_tables()`.

## Run

```bash
source .venv/bin/activate
uvicorn app.main:app --reload
```

- **API + docs:** http://127.0.0.1:8000  
- **Interactive API docs:** http://127.0.0.1:8000/docs  
- **Health check:** http://127.0.0.1:8000/health  

The root URL serves the frontend (login, register, forgot password, reset password, and workout list/create/edit/delete).

## API overview

| Area        | Endpoints |
|------------|-----------|
| **Auth**   | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `POST /auth/forgot-password`, `POST /auth/reset-password` |
| **Users**  | `GET /users`, `GET /users/me`, `GET /users/{id}` (all require Bearer token) |
| **Workouts** | `POST /workouts`, `GET /workouts`, `GET /workouts/{id}`, `PATCH /workouts/{id}`, `DELETE /workouts/{id}` (user-scoped, require Bearer token) |

Workout payload includes: `name`, `description`, `workout_type`, `started_at`, `duration_minutes`, `avg_heart_rate_bpm`, `active_calories`, `total_calories`.

## Deploy to AWS Elastic Beanstalk

1. **Install EB CLI** (one-time): `pip install awsebcli` (or use AWS Console and upload a zip).

2. **Create app and environment** from project root:
   ```bash
   eb init -p "Python 3.11" tiny-api --region us-east-1
   eb create
   ```
   When prompted, pick a region and environment name (or use defaults).

3. **Set environment variables** in the Elastic Beanstalk console (Configuration → Software → Environment properties), or with the CLI:
   ```bash
   eb setenv SECRET_KEY="$(openssl rand -hex 32)"
   ```
   For production, also set `FRONTEND_BASE_URL` to your EB URL (e.g. `https://your-env.us-east-1.elasticbeanstalk.com`) so password-reset links work.

4. **Deploy** (after the first `eb create`, use this to deploy updates):
   ```bash
   eb deploy
   ```

The app uses the **Procfile** (`web: uvicorn app.main:app --host 0.0.0.0 --port 8000`) and **requirements.txt**; EB installs dependencies and runs uvicorn. By default the app uses SQLite on the instance (data can be lost on redeploy or scaling). For persistent data, add an RDS database and set `DATABASE_URL`, then run `alembic upgrade head` (e.g. via an `.ebextensions` command or one-off).

## Environment variables

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | JWT signing key; set a long random value in production. |
| `DATABASE_URL` | Override DB URL (default: SQLite `database.db` at project root). |
| `FRONTEND_BASE_URL` | Base URL for password-reset links (default: `http://127.0.0.1:8000`). |

Settings are loaded from `.env` via `pydantic-settings` in `app/core/config.py`.
