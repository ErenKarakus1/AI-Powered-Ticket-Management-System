FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS build
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY tsconfig.json ./
COPY src ./src
ENV DATABASE_URL=postgresql://postgres:postgres@postgres:5432/ai_ticket_management?schema=public
RUN npm run prisma:generate
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
COPY package*.json ./
RUN npm ci
ENV NODE_ENV=production
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/generated ./src/generated
EXPOSE 5000
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
