# Finance Dashboard

Backend API for a finance dashboard: **Express** + **Drizzle ORM** + **PostgreSQL**. **JWT** authentication and **role-based access** (`viewer`, `analyst`, `admin`). This repository documents and ships the **REST API only** (no frontend app in scope).

**Postman:** Import **[`postman/Finance-Dashboard.postman_collection.json`](postman/Finance-Dashboard.postman_collection.json)**. Full payloads and status codes are in **[`server/API.md`](server/API.md)**.

### Demo admin

Use these to log in as **`admin`** with **`POST /api/auth/login`** once that user exists (e.g. on a seeded or shared demo database):

| Field | Value |
|-------|--------|
| **Email** | `admin@test.com` |
| **Password** | `admin123` |

On an **empty** database, the **first** `POST /api/auth/register` becomes `admin`.

---

## Prerequisites

- Node.js 18+
- PostgreSQL (e.g. [Neon](https://neon.tech))

---

## Backend quick start (`server/`)

```bash
cd server
cp .env.example .env
# Edit .env: DATABASE_URL, JWT_SECRET
npm install
npm run db:push
npm run dev
```

Server listens on `PORT` (default **5000**).

**Drizzle Studio:** With `DATABASE_URL` set in `.env`, you can open a local UI to inspect tables and data:

```bash
npx drizzle-kit studio
```

Run this from the `server/` directory (same place as `drizzle.config.js`). It uses your configured Postgres connection.

---

## Backend architecture


| Layer                  | Role                                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| `**src/config/`**      | Central `ENV` and `db` (Drizzle + `pg` pool, SSL for hosted Postgres).                       |
| `**src/db/schema.js**` | Tables and enums: `users`, `transactions`.                                                   |
| `**src/routes/**`      | HTTP path registration only; chains middleware + controller handlers.                        |
| `**src/controllers/**` | Request/response handling, status codes, delegates to services, `next(err)`.                 |
| `**src/services/**`    | Business logic, queries, aggregations, rules (e.g. first user = admin, soft delete).         |
| `**src/middleware/**`  | `auth` (JWT), `rbac` (`requireRoles`), `validate` (Zod), rate limits, global `errorHandler`. |
| `**src/validators/**`  | Zod schemas for bodies.                                                                      |
| `**src/utils/**`       | Shared helpers: `formatSuccess` / `formatError`, JWT sign, role/status constants.            |
| `**src/app.js**`       | Express app: CORS, JSON, rate limits, route mounts, health check, error handler last.        |


**Flow:** Route → (optional) `validate` → `authMiddleware` → (optional) `requireRoles` → controller → service → DB → JSON response or `next(err)` → `errorHandler`.

## Rate limiting

To reduce abuse and brute-force pressure on authentication, limits are applied with `**express-rate-limit`** (see `server/src/middleware/rateLimiter.js`):

- `**/api/***` (all API routes, including health) → **100 requests / 15 minutes** per caller
- `**/api/auth/*`** → **20 requests / 15 minutes** per caller (stricter; runs in addition to the general `/api` limiter for auth paths)

When exceeded, the API responds with **HTTP 429 Too Many Requests** and a short JSON error message (`formatError`).

## Security

- Passwords are hashed with **bcrypt** (via the `**bcryptjs`** library) before storage; **plain text passwords are never stored**
- **JWT** is used for stateless authentication (`Authorization: Bearer <token>`)
- **RBAC** is enforced in middleware after JWT verification (see route tables below)

## Data integrity

- **Transactions** use **soft delete** (`isDeleted`); `DELETE` sets the flag instead of removing the row
- Soft-deleted rows are **excluded from list, get, and dashboard aggregations** so API responses never surface them as active rows
- Supports safer operations and leaves room for future recovery if needed

## Validation

- Request bodies (and relevant params) are validated with **Zod** schemas in `server/src/validators/` and the `**validate`** middleware
- Invalid input returns **HTTP 400** with structured error detail (via the global `**errorHandler`**), so bad data does not reach service logic

## Design decisions

- **Service layer** holds business rules and DB access; **controllers** stay thin (HTTP mapping, status codes, `next(err)`)
- **Middleware** owns cross-cutting concerns: JWT auth, role checks, Zod validation, and rate limits
- **First registered user becomes `admin`** so a fresh database can be bootstrapped without a separate seed step; later self-registrations default to `**viewer**`
- **PostgreSQL `numeric` fields** (e.g. amounts, aggregates) are normalized to **JavaScript numbers** in the service layer where responses are built, avoiding stringly-typed money values in JSON

---

## All API routes

Base path: `**/api`**. Unless noted, JSON bodies require `**Content-Type: application/json**`. Protected routes need `**Authorization: Bearer <token>**`.

### Health & auth


| Method | Path                 | Auth | Description                                                        |
| ------ | -------------------- | ---- | ------------------------------------------------------------------ |
| `GET`  | `/api/health`        | None | Liveness check (`{ "status": "OK" }`).                             |
| `POST` | `/api/auth/register` | None | Register; first user → `admin`, later → `viewer`.                  |
| `POST` | `/api/auth/login`    | None | Returns JWT + public user fields; inactive users rejected (`403`). |
| `GET`  | `/api/auth/me`       | JWT  | Current user profile (no password).                                |


### Users (admin only)


| Method  | Path                    | Roles   | Description                                                     |
| ------- | ----------------------- | ------- | --------------------------------------------------------------- |
| `GET`   | `/api/users`            | `admin` | List users (no passwords).                                      |
| `GET`   | `/api/users/:id`        | `admin` | Single user.                                                    |
| `POST`  | `/api/users`            | `admin` | Create user with chosen role.                                   |
| `PATCH` | `/api/users/:id`        | `admin` | Partial update (name/role); `{}` → `400` “No fields to update”. |
| `PATCH` | `/api/users/:id/status` | `admin` | Set `active` / `inactive`.                                      |


### Transactions


| Method   | Path                    | Roles                        | Description                                                                                                                                 |
| -------- | ----------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/api/transactions`     | `admin`, `analyst`, `viewer` | List with optional `**type**`, `**category**`, `**from**`, `**to**`, `**page**`, `**limit**`; excludes soft-deleted; `meta` for pagination. |
| `GET`    | `/api/transactions/:id` | `admin`, `analyst`, `viewer` | Single transaction (not soft-deleted).                                                                                                      |
| `POST`   | `/api/transactions`     | `admin`                      | Create; `**createdBy**` set from JWT, not from the request body.                                                                            |
| `PATCH`  | `/api/transactions/:id` | `admin`                      | Partial update; empty body → `400` “No fields to update”.                                                                                   |
| `DELETE` | `/api/transactions/:id` | `admin`                      | Soft delete (`isDeleted`); subsequent get/list omit row.                                                                                    |


### Dashboard


| Method | Path                     | Roles                        | Description                                                         |
| ------ | ------------------------ | ---------------------------- | ------------------------------------------------------------------- |
| `GET`  | `/api/dashboard/summary` | `admin`, `analyst`           | Total income/expenses, net balance, category breakdown.             |
| `GET`  | `/api/dashboard/trends`  | `admin`, `analyst`           | Time series: query `**granularity=month**` (default) or `**week**`. |
| `GET`  | `/api/dashboard/recent`  | `admin`, `analyst`, `viewer` | Last 5 non-deleted transactions, newest first.                      |


**RBAC summary:** Viewers can **read** transactions and **recent** activity only. **Analysts** get analytics (summary + trends) and reads. **Admins** manage users and all transaction writes.

---

## Assumptions and tradeoffs

- **Viewer** vs **insights:** Viewers see **transactions** and **recent** but not **summary/trends** so “dashboard insight” endpoints are clearly tied to **analyst/admin**.
- **Registration:** Self-serve register is suitable for demos; production systems often disable open registration.
- **Not implemented:** fuzzy **search** on transactions, **automated tests**, a separate **UI** consuming these APIs.

---

## Deployment (production)


| Piece      | Suggested host                                                                                                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PostgreSQL | [Neon](https://neon.tech) (or any Postgres)                                                                                                                                                      |
| API        | [Render](https://render.com) Web Service — **Root directory** `server/`, **Build** `npm install`, **Start** `node src/app.js`, env: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_URL` |


**Render free tier:** instances **sleep** when idle; the **first request after sleep** can be slow — expected, not a broken API.

---

## Scripts (`server/`)


| Command               | Purpose                             |
| --------------------- | ----------------------------------- |
| `npm run dev`         | Dev server with watch               |
| `npm start`           | Production `node src/app.js`        |
| `npm run db:push`     | Push Drizzle schema to the database |
| `npm run db:generate` | Generate Drizzle migrations         |
| `npx drizzle-kit studio` | Open Drizzle Studio (browse DB; run from `server/` with `DATABASE_URL` set) |


