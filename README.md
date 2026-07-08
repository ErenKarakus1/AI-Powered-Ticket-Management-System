# AI-Powered Ticket Management System

A full-stack support ticket management system built with a React frontend, an Express backend, PostgreSQL, Prisma, RabbitMQ, and an AI worker for ticket analysis.

This project was built as a learning and portfolio project. I used Codex while building it to help plan features, implement code, test behavior, and improve the development workflow.

## Features

- User registration and login with JWT authentication
- Role-based access for `USER` and `ADMIN`
- Users can create tickets and view only their own tickets
- Admins can view the admin queue and manage all tickets
- Ticket status flow: `OPEN`, `IN PROGRESS`, `RESOLVED`, `CLOSED`
- Ticket priority flow: `UNASSIGNED`, `LOW`, `MEDIUM`, `HIGH`, `URGENT`
- Ticket messaging between users and admins
- User notifications for unread admin messages
- Closed tickets are read-only for users
- Only admins can see AI ticket analysis
- AI worker consumes RabbitMQ jobs and stores ticket analysis in PostgreSQL
- Filtering by status, priority, and search
- Paginated ticket loading with a load-more flow
- Backend integration tests for ticket privacy, notifications, and closed-ticket behavior

## Tech Stack

- Backend: Node.js, Express, TypeScript
- Frontend: React, TypeScript, Vite
- Database: PostgreSQL
- ORM: Prisma
- Queue: RabbitMQ
- AI worker: TypeScript, OpenAI API
- Auth: JWT, bcrypt

## Project Structure

```text
.
├── backend/      Express API, Prisma schema, auth, ticket routes, tests
├── frontend/     React application
└── ai-worker/    RabbitMQ consumer for AI ticket analysis
```

## Requirements

- Node.js
- PostgreSQL
- RabbitMQ
- npm
- OpenAI API key for the AI worker

Docker is not required for the current setup.

## Backend Setup

```bash
cd backend
npm install
copy .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Update `backend/.env`:

```env
PORT=5000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_ticket_management?schema=public"
JWT_SECRET="replace-with-a-long-random-secret"
RABBITMQ_URL="amqp://localhost:5672"
TICKET_ANALYSIS_QUEUE="ticket.analysis"
```

If RabbitMQ is not running, tickets can still be created, but AI analysis jobs will not be processed.

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

The frontend proxies API requests through `/api` to the backend.

## AI Worker Setup

The backend publishes ticket analysis jobs to RabbitMQ. The AI worker consumes those jobs, calls OpenAI, stores `TicketAnalysis`, and updates the ticket priority.

```bash
cd ai-worker
npm install
copy .env.example .env
npm run dev
```

Update `ai-worker/.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_ticket_management?schema=public"
RABBITMQ_URL="amqp://localhost:5672"
TICKET_ANALYSIS_QUEUE="ticket.analysis"
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-5.4-nano"
```


## RabbitMQ

Start RabbitMQ locally before running the worker. The app expects:

```text
amqp://localhost:5672
```

The default queue name is:

```text
ticket.analysis
```

## Useful Commands

Backend:

```bash
cd backend
npm run dev
npm run build
npm test
npx prisma validate
```

Frontend:

```bash
cd frontend
npm run dev -- --host 127.0.0.1
npm run build
```

AI worker:

```bash
cd ai-worker
npm run dev
npm run build
```

## Admin Accounts

Public registration creates `USER` accounts only.

Admin accounts are created manually in the database.

## Security Notes

- Users cannot access admin ticket routes.
- Users cannot see AI analysis responses.
- Users cannot reply to closed tickets.
- Admins can only access unassigned tickets or tickets assigned to themselves.
- Admin-only AI analysis is returned through admin ticket endpoints.

## Current Limitations

- No Docker setup yet
- No Redis setup yet; planned for login, registration, ticket creation, and message rate limiting
- No production deployment configuration yet
- No password reset flow yet
- RabbitMQ and PostgreSQL are expected to run locally
