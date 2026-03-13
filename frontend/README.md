# One Hostel Manager Frontend

## Run locally

```powershell
cmd /c npm install
cmd /c npm run dev
```

Set environment variable in `.env.local`:

```env
DJANGO_API_BASE_URL=http://localhost:8000/api/v1
```

## Phase 1 delivered

- App Router route groups:
  - `(auth)/login`
  - `(dashboard)/dashboard`
  - `(dashboard)/members`
  - `(dashboard)/rooms`
  - `(dashboard)/allotments`
  - `(dashboard)/billing`
  - `(dashboard)/attendance`
  - `(dashboard)/reports`
  - `(dashboard)/settings`
- Tailwind CSS UI with responsive admin shell
- Login form via React Hook Form + Zod
- TanStack Query session bootstrap
- Next route handlers for cookie-based JWT session:
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/auth/session`
  - `GET /api/dashboard/summary`
  - `GET|POST /api/members`
  - `GET|PATCH|DELETE /api/members/{id}`
