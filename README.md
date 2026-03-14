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
- Dashboard summary: `GET /reports/dashboard-summary/`
- Members: `/members/`
- Rooms: `/rooms/`
- Beds: `/rooms/beds/`
- Allotments: `/allotments/`
- Billing status: `/billing/status/` (member-integrated summary)
- Attendance status: `/attendance/status/` (member-integrated summary)
- Reports status: `/reports/status/`
- Occupancy report: `/reports/occupancy/`
- Fee collection report: `/reports/fee-collection/`
- Pending dues report: `/reports/pending-dues/`
- Attendance report: `/reports/attendance/`
- Settings status: `/settings/status/`
- Current settings: `/settings/current/`
- Notifications status: `/notifications/status/` (member-integrated summary)
- Audit scaffold: `/audit/status/`

## Phase 1 status

- Tailwind CSS + App Router route groups + responsive dashboard shell
- Next route handlers for cookie-based JWT session
- React Hook Form + Zod login validation
- TanStack Query session bootstrap
- Backend RBAC policy map + DRF permission integration + transactional user service
