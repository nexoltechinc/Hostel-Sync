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
- `GET|POST|PATCH|DELETE /api/v1/billing/fee-plans/`
- `GET|POST /api/v1/billing/member-fee-plans/`
- `POST /api/v1/billing/member-fee-plans/{id}/close/`
- `GET|POST /api/v1/billing/invoices/`
- `POST /api/v1/billing/invoices/generate-monthly/`
- `POST /api/v1/billing/invoices/{id}/add-charge/`
- `POST /api/v1/billing/invoices/{id}/apply-credit/`
- `GET|POST /api/v1/billing/payments/`
- `GET /api/v1/billing/credits/`
- `GET /api/v1/attendance/status/`
- `GET|POST|PATCH /api/v1/attendance/records/`
- `GET /api/v1/attendance/records/daily-sheet/`
- `POST /api/v1/attendance/records/bulk-mark/`
- `GET /api/v1/notifications/status/`
- `GET|POST|PATCH|DELETE /api/v1/notifications/announcements/`
- `POST /api/v1/notifications/announcements/{id}/publish/`
- `POST /api/v1/notifications/announcements/{id}/archive/`
- `GET|POST /api/v1/notifications/notifications/`
- `POST /api/v1/notifications/notifications/{id}/mark-read/`
- `POST /api/v1/notifications/notifications/{id}/dismiss/`
- `POST /api/v1/notifications/notifications/generate-fee-reminders/`
- `GET /api/v1/reports/status/`
- `GET /api/v1/reports/dashboard-summary/`
- `GET /api/v1/reports/occupancy/`
- `GET /api/v1/reports/fee-collection/`
- `GET /api/v1/reports/pending-dues/`
- `GET /api/v1/reports/attendance/`
- `GET /api/v1/settings/status/`
- `GET|PATCH /api/v1/settings/current/`
- `GET /api/v1/audit/status/`

## Phase 1

- JWT auth (SimpleJWT)
- Role-based access checks via centralized RBAC map
- Transactional service layer for staff user provisioning/updating
- Core backend modules delivered through reports, settings, and dashboard integration; audit remains scaffold-only
