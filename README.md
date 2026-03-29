# Logical Control

Spring Boot 4.0.4 + React 19 + Vite 8 + `shadcn/ui` asosidagi full-stack web app.

## Stack

- Backend: Spring Boot 4.0.4, Spring Security, JWT, JPA, Flyway, PostgreSQL
- Frontend: React 19, Vite 8, TypeScript, `shadcn/ui`, Tailwind CSS v4, React Query, React Flow
- UX: dark/light/system mode, 4 palette, resizeable sidebar, 4 til (`uzCyrl`, `uzLatn`, `ru`, `en`)

## Folderlar

- `backend` - Spring Boot API
- `frontend` - React web app

## Demo login

- Username: `admin`
- Password: `Admin123!`

## PostgreSQL

Ilova quyidagi ulanish bilan sozlangan:

- DB: `logical_control`
- User: `postgres`
- Password: `00229005`

Agar DB hali yaratilmagan bo'lsa:

```sql
create database logical_control owner postgres;
```

## Backendni ishga tushirish

```powershell
cd backend
.\gradlew.bat bootRun
```

API default manzil:

- `http://localhost:8070/api`

Agar `8070` port band bo'lsa:

```powershell
$env:SERVER_PORT=8071
.\gradlew.bat bootRun
```

## Frontendni ishga tushirish

```powershell
cd frontend
npm install
npm run dev
```

Frontend default manzil:

- `http://localhost:5173`

## Muhim endpointlar

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/dashboard/summary`
- `GET /api/controls`
- `POST /api/controls`
- `PUT /api/controls/{id}`
- `POST /api/controls/{id}/duplicate`
- `GET /api/logs`
- `GET /api/lookups/bootstrap`

## Tayyor sahifalar

- Login page
- Dashboard
- MN Ro'yxati
- MN Yaratish / Tahrirlash
- Visual Rule Builder
- Logs va statistika

## Build tekshiruvi

- Backend: `.\gradlew.bat test bootJar`
- Frontend: `npm run build`
