# AI-Powered Ticket Management System

A full-stack support ticket platform for portfolio and internship applications.

## Current status

This repository currently contains the backend foundation only:

- Express + TypeScript
- dotenv environment loading
- Prisma configured for PostgreSQL
- `GET /health`
- `GET /health/db`

Frontend, AI worker, authentication, ticket CRUD, Redis, RabbitMQ, OpenAI integration, and Docker are intentionally not implemented yet.

## Backend setup

```bash
cd backend
npm install
cp .env.example .env
npx prisma generate
npm run dev
```

Set `DATABASE_URL` in `backend/.env` before using database-backed endpoints.
