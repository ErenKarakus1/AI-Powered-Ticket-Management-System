# AI-Powered Ticket Management System

A full-stack support ticket management system with user tickets, admin queues, ticket messaging, asynchronous AI-assisted ticket analysis, Redis-backed rate limiting, and Docker support.

This project was built as a learning and portfolio project. I used Codex while building it to plan features, implement code, test behavior, and improve the development workflow.

## Features

- User registration and login with JWT authentication
- Role-based access for `USER` and `ADMIN`
- Users can create tickets and view only their own tickets
- Admins can manage unassigned tickets and tickets assigned to themselves
- Ticket status flow: `OPEN`, `IN PROGRESS`, `RESOLVED`, `CLOSED`
- Ticket priority flow: `UNASSIGNED`, `LOW`, `MEDIUM`, `HIGH`, `URGENT`
- Ticket messaging between users and admins
- User notifications for unread admin messages and ticket assignment
- Closed tickets are read-only for users
- AI worker asynchronously analyzes tickets through RabbitMQ and stores category, priority, and summary
- AI analysis is visible only to admins
- Redis-backed rate limiting for auth, ticket creation, and messages
- Filtering by status, priority, assignment, and search
- Paginated ticket loading with a load-more flow
- Backend tests for privacy, notifications, admin access, stats, sorting, and rate limiting
- Docker Compose setup for the full stack

## Tech Stack

- Backend: Node.js, Express, TypeScript
- Frontend: React, TypeScript, Vite, Nginx for Docker
- Database: PostgreSQL
- ORM: Prisma
- Queue: RabbitMQ
- Cache/rate-limit store: Redis
- AI worker: TypeScript, OpenAI API
- Auth: JWT, bcrypt
- Containerization: Docker, Docker Compose

## Project Structure

```text
.
|-- backend/      Express API, Prisma schema, auth, ticket routes, tests
|-- frontend/     React application
|-- ai-worker/    RabbitMQ consumer for AI ticket analysis
`-- docker-compose.yml
```

## Workflow Diagram

```mermaid
flowchart TD
    User[User] --> Frontend[React Frontend]
    Admin[Admin] --> Frontend

    Frontend --> API[Express API]

    API --> Middleware[JWT Auth, Role Checks, Rate Limit Middleware]
    Middleware -->|read and increment counter| Redis[(Redis Counter Store)]
    Redis -->|rate limit result| Middleware
    Middleware --> Services[Ticket, Message, and Admin Services]

    Services --> DB[(PostgreSQL via Prisma)]
    Services --> Queue[RabbitMQ Ticket Analysis Queue]

    Queue --> Worker[AI Worker]
    Worker --> OpenAI[OpenAI API]
    OpenAI --> Worker
    Worker --> DB

    DB --> Services
    Services --> API
    API --> Frontend
```

## Quick Start With Docker

Docker is the easiest way to run the project.

```bash
docker compose up --build
```

The default Docker stack starts:

```text
Frontend: http://localhost:5173
Backend API: http://localhost:5000
PostgreSQL: localhost:5433
RabbitMQ: localhost:5672
RabbitMQ Management UI: http://localhost:15672
Redis: localhost:6379
```

Docker Redis uses `redis-password` as its local development password.

RabbitMQ management login:

```text
guest / guest
```

The backend container runs Prisma migrations on startup.

Stop the stack:

```bash
docker compose down
```

Delete Docker volumes as well:

```bash
docker compose down -v
```

## Docker With AI Worker

The AI worker is behind the `ai` profile so the app can run without an OpenAI key.

PowerShell:

```powershell
$env:OPENAI_API_KEY="your-api-key"
docker compose --profile ai up --build
```

Command Prompt:

```cmd
set OPENAI_API_KEY=your-api-key
docker compose --profile ai up --build
```

Bash:

```bash
OPENAI_API_KEY="your-api-key" docker compose --profile ai up --build
```

## Admin Account

Public registration creates `USER` accounts only. Admin accounts must be created manually.

If Docker is running, seed or reset a demo admin from the project root:

```bash
docker compose exec backend npm run seed:admin
```

Demo admin login:

```text
email: admin@demo.com
password: adminuser123
```

To customize the admin account, set `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in the same terminal before running the seed command.

PowerShell:

```powershell
$env:ADMIN_NAME="Support Admin"
$env:ADMIN_EMAIL="admin@example.com"
$env:ADMIN_PASSWORD="change-this-password"
docker compose exec backend npm run seed:admin
```

Command Prompt:

```cmd
set ADMIN_NAME=Support Admin
set ADMIN_EMAIL=admin@example.com
set ADMIN_PASSWORD=change-this-password
docker compose exec backend npm run seed:admin
```

Bash:

```bash
ADMIN_NAME="Support Admin" ADMIN_EMAIL="admin@example.com" ADMIN_PASSWORD="change-this-password" docker compose exec backend npm run seed:admin
```

## Manual Backend Setup

Use this if you do not want to run the backend in Docker.

```bash
cd backend
npm install
copy .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run seed:admin:dev
npm run dev
```

Example `backend/.env`:

```env
PORT=5000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_ticket_management?schema=public"
JWT_SECRET="replace-with-a-long-random-secret"
RABBITMQ_URL="amqp://localhost:5672"
TICKET_ANALYSIS_QUEUE="ticket.analysis"
REDIS_URL="redis://localhost:6379"
RATE_LIMIT_STORE="memory"
```

- `RATE_LIMIT_STORE="memory"` keeps rate-limit counters inside the backend process for simple local development.
- `RATE_LIMIT_STORE="redis"` uses Redis-backed shared counters that survive backend restarts.

## Manual Frontend Setup

```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1
```

If PowerShell cannot run `npm`, use the Windows command shim:

```powershell
npm.cmd run dev -- --host 127.0.0.1
```

Open:

```text
http://127.0.0.1:5173
```

## Manual AI Worker Setup

The backend publishes ticket analysis jobs to RabbitMQ. The AI worker consumes those jobs, calls OpenAI, stores `TicketAnalysis`, and updates ticket priority.

```bash
cd ai-worker
npm install
copy .env.example .env
npm run dev
```

Example `ai-worker/.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_ticket_management?schema=public"
RABBITMQ_URL="amqp://localhost:5672"
TICKET_ANALYSIS_QUEUE="ticket.analysis"
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-5.4-nano"
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

Docker:

```bash
docker compose up --build
docker compose down
docker compose exec backend npm run seed:admin
docker compose exec redis sh -c "REDISCLI_AUTH=redis-password redis-cli FLUSHALL"
```

## Security Notes

- Users cannot access admin ticket routes.
- Users cannot see AI analysis responses.
- Users cannot reply to closed tickets.
- Admins can only access unassigned tickets or tickets assigned to themselves.
- Admin-only AI analysis is returned through admin ticket endpoints.
- Rate limits protect login, registration, ticket creation, and message creation.
- Real production deployments should replace demo secrets and configure stronger environment management.

## Current Limitations

- No production deployment configuration yet
- No password reset flow yet
- No email notifications yet
