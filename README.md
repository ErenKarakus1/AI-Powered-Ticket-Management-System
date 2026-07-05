# AI-Powered Ticket Management System

A full-stack support ticket platform for portfolio and internship applications.

## Current Features

- React + TypeScript frontend
- Express + TypeScript backend
- PostgreSQL database with Prisma
- JWT authentication
- User registration and login
- User ticket creation and own-ticket views
- Admin ticket queue
- Admin status and priority updates
- Ticket messages between users and admins
- Health checks at `GET /health` and `GET /health/db`

AI analysis, RabbitMQ, Redis, Docker, and the AI worker are planned for later.

## Project Structure

```text
backend/
frontend/
ai-worker/
```

## Backend Setup

```bash
cd backend
npm install
copy .env.example .env
npm run prisma:generate
npx prisma migrate dev
npm run dev
```

Update `backend/.env` with your local PostgreSQL `DATABASE_URL` and `JWT_SECRET`.

## Frontend Setup

```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1
```

Open:

```text
http://127.0.0.1:5173
```

The frontend proxies `/api` requests to the backend on `http://localhost:5000`.

## Development Commands

Backend:

```bash
cd backend
npm run build
npm run prisma:generate
npx prisma migrate status
```

Frontend:

```bash
cd frontend
npm run build
```

## Roles

Public registration always creates `USER` accounts.

Admin accounts are created manually in the database. Users can create and view their own tickets. Admins use `/admin/tickets` and cannot use user ticket routes.
