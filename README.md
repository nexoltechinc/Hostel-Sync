# One Hostel Manager

Monorepo scaffold with:

- `frontend/`: Next.js web application
- `backend/`: Django REST API with PostgreSQL configuration

## Backend quick start

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python manage.py migrate
.\.venv\Scripts\python manage.py createsuperuser
.\.venv\Scripts\python manage.py runserver
```

## Frontend quick start

```powershell
cd frontend
cmd /c npm install
Copy-Item .env.local.example .env.local
cmd /c npm run dev
```

## API base

- Base path: `http://localhost:8000/api/v1`
- Auth login: `POST /auth/login/`
- Token refresh: `POST /auth/refresh/`
- Profile: `GET /auth/me/profile/`
- Members: `/members/`
- Rooms: `/rooms/`
- Beds: `/rooms/beds/`
- Allotments: `/allotments/`
- Billing scaffold: `/billing/status/`
- Attendance scaffold: `/attendance/status/`
- Reports scaffold: `/reports/status/`
- Notifications scaffold: `/notifications/status/`
- Audit scaffold: `/audit/status/`

## Phase 1 status

- Tailwind CSS + App Router route groups + responsive dashboard shell
- Next route handlers for cookie-based JWT session
- React Hook Form + Zod login validation
- TanStack Query session bootstrap
- Backend RBAC policy map + DRF permission integration + transactional user service
