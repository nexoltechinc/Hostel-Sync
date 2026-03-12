# One Hostel Manager Backend

Django REST API with PostgreSQL configuration and JWT auth.

## Setup

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
```

Copy `.env.example` to `.env` and set PostgreSQL credentials.
Environment variables are auto-loaded from `.env`.

## Run

```powershell
.\.venv\Scripts\python manage.py migrate
.\.venv\Scripts\python manage.py createsuperuser
.\.venv\Scripts\python manage.py runserver
```

## API

- `POST /api/v1/auth/login/`
- `POST /api/v1/auth/refresh/`
- `GET /api/v1/auth/me/profile/`
- `GET|POST|PATCH|DELETE /api/v1/auth/users/` (RBAC restricted)
- `GET|POST /api/v1/members/`
- `GET|POST /api/v1/rooms/`
- `GET|POST /api/v1/rooms/beds/`
- `GET|POST /api/v1/allotments/`
- `POST /api/v1/allotments/{id}/transfer/`
- `POST /api/v1/allotments/{id}/checkout/`
- `GET /api/v1/billing/status/`
- `GET /api/v1/attendance/status/`
- `GET /api/v1/notifications/status/`
- `GET /api/v1/reports/status/`
- `GET /api/v1/audit/status/`

## Phase 1

- JWT auth (SimpleJWT)
- Role-based access checks via centralized RBAC map
- Transactional service layer for staff user provisioning/updating
- App scaffolds for upcoming modules: billing, attendance, notifications, reports, audit
