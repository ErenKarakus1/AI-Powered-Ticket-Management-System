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
- AI ticket analysis on ticket creation with OpenAI
- Health checks at `GET /health` and `GET /health/db`

Redis and Docker are planned for later.

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

Optional backend queue settings:

```env
RABBITMQ_URL="amqp://localhost:5672"
TICKET_ANALYSIS_QUEUE="ticket.analysis"
```

If `RABBITMQ_URL` is empty, tickets are still created normally and AI analysis jobs are not queued.

## AI Worker Setup

The backend publishes ticket analysis jobs to RabbitMQ. The AI worker consumes those jobs, calls OpenAI, stores `TicketAnalysis`, and updates the ticket priority.

```bash
cd ai-worker
npm install
copy .env.example .env
npm run dev
```

Update `ai-worker/.env` with:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_ticket_management?schema=public"
RABBITMQ_URL="amqp://localhost:5672"
TICKET_ANALYSIS_QUEUE="ticket.analysis"
OPENAI_API_KEY="your-api-key"
OPENAI_MODEL="gpt-5.4-nano"
```

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

AI worker:

```bash
cd ai-worker
npm run build
```

Frontend:

```bash
cd frontend
npm run build
```

## Roles

Public registration always creates `USER` accounts.

Admin accounts are created manually in the database. Users can create and view their own tickets. Admins use `/admin/tickets` and cannot use user ticket routes.
