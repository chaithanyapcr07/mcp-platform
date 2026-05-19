# Local Development Setup

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env`.
4. Start PostgreSQL with `docker compose -f infra/docker-compose.yml up postgres`.
5. Run `npm run db:generate`, `npm run db:migrate`, and `npm run db:seed`.
6. Start the connector with `npm run dev:connector`.
7. Start the API with `npm run dev`.
8. Start the portal with `npm run dev:web`.

For the full local stack, use `docker compose -f infra/docker-compose.yml up --build`.
