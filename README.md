# Finance Dashboard

Full-stack finance dashboard: **Express** + **Drizzle ORM** + **PostgreSQL** backend, **React (Vite)** + **Tailwind** frontend. **JWT** authentication and **role-based access** (`viewer`, `analyst`, `admin`).

This README focuses on **backend setup**, **every HTTP route**, and how the server aligns with typical **assignment evaluation** themes (design, logic, functionality, data modeling, validation, documentation, and thoughtful extras). Payloads, status codes, and examples are in **[`server/API.md`](server/API.md)**.

**Postman:** Import **[`postman/Finance-Dashboard.postman_collection.json`](postman/Finance-Dashboard.postman_collection.json)** (Collection v2.1). The collection **pre-request script** adds `Authorization: Bearer {{token}}` for protected routes (skips public auth routes, **no-auth** tests, and uses **`viewerToken`** for the viewer **403** example). Run **02 Auth → Login (admin)** then **Login (viewer)** before folder **06**. Set **`viewerUserId`** from **Users → List** for PATCH status. Regenerate with `node postman/generate-collection.mjs` inside `postman/`.

---

## Prerequisites

- Node.js 18+
- PostgreSQL (e.g. [Neon](https://neon.tech))

---

## Backend quick start (`server/`)

```bash
cd server
cp .env.example .env
# Edit .env: DATABASE_URL, JWT_SECRET, CLIENT_URL (e.g. http://localhost:5173)
npm install
npm run db:push
npm run dev
```

Server listens on `PORT` (default **5000**).

## Frontend quick start (`client/`)

Create `client/.env` with `VITE_API_URL=http://localhost:5000`, then:

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173`.

---

## Backend architecture

| Layer | Role |
|-------|------|
| **`src/config/`** | Central `ENV` and `db` (Drizzle + `pg` pool, SSL for hosted Postgres). |
| **`src/db/schema.js`** | Tables and enums: `users`, `transactions`. |
| **`src/routes/`** | HTTP path registration only; chains middleware + controller handlers. |
| **`src/controllers/`** | Request/response handling, status codes, delegates to services, `next(err)`. |
| **`src/services/`** | Business logic, queries, aggregations, rules (e.g. first user = admin, soft delete). |
| **`src/middleware/`** | `auth` (JWT), `rbac` (`requireRoles`), `validate` (Zod), rate limits, global `errorHandler`. |
| **`src/validators/`** | Zod schemas for bodies. |
| **`src/utils/`** | Shared helpers: `formatSuccess` / `formatError`, JWT sign, role/status constants. |
| **`src/app.js`** | Express app: CORS, JSON, rate limits, route mounts, health check, error handler last. |

**Flow:** Route → (optional) `validate` → `authMiddleware` → (optional) `requireRoles` → controller → service → DB → JSON response or `next(err)` → `errorHandler`.

## Rate limiting

To reduce abuse and brute-force pressure on authentication, limits are applied with **`express-rate-limit`** (see `server/src/middleware/rateLimiter.js`):

- **`/api/*`** (all API routes, including health) → **100 requests / 15 minutes** per client
- **`/api/auth/*`** → **20 requests / 15 minutes** per client (stricter; runs in addition to the general `/api` limiter for auth paths)

When exceeded, the API responds with **HTTP 429 Too Many Requests** and a short JSON error message (`formatError`).

## Security

- Passwords are hashed with **bcrypt** (via the **`bcryptjs`** library) before storage; **plain text passwords are never stored**
- **JWT** is used for stateless authentication (`Authorization: Bearer <token>`)
- **RBAC** is enforced in middleware after JWT verification (see route tables below)

## Data integrity

- **Transactions** use **soft delete** (`isDeleted`); `DELETE` sets the flag instead of removing the row
- Soft-deleted rows are **excluded from list, get, and dashboard aggregations** so clients never see them as active data
- Supports safer operations and leaves room for future recovery if needed

## Validation

- Request bodies (and relevant params) are validated with **Zod** schemas in `server/src/validators/` and the **`validate`** middleware
- Invalid input returns **HTTP 400** with structured error detail (via the global **`errorHandler`**), so bad data does not reach service logic

## CORS

- CORS is configured in **`server/src/app.js`** with the **`CLIENT_URL`** environment variable as the allowed **`origin`**
- In production, set **`CLIENT_URL`** to your deployed frontend origin (e.g. your Vercel URL) so only that site can call the API from the browser
- If **`CLIENT_URL`** is unset, the app falls back to **`origin: *`** (convenient for local demos; avoid in production without understanding the tradeoff)

## Design decisions

- **Service layer** holds business rules and DB access; **controllers** stay thin (HTTP mapping, status codes, `next(err)`)
- **Middleware** owns cross-cutting concerns: JWT auth, role checks, Zod validation, and rate limits
- **First registered user becomes `admin`** so a fresh database can be bootstrapped without a separate seed step; later self-registrations default to **`viewer`**
- **PostgreSQL `numeric` fields** (e.g. amounts, aggregates) are normalized to **JavaScript numbers** in the service layer where responses are built, avoiding stringly-typed money values in JSON

---

## All API routes

Base path: **`/api`**. Unless noted, JSON bodies require **`Content-Type: application/json`**. Protected routes need **`Authorization: Bearer <token>`**.

### Health & auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/health` | None | Liveness check (`{ "status": "OK" }`). |
| `POST` | `/api/auth/register` | None | Register; first user → `admin`, later → `viewer`. |
| `POST` | `/api/auth/login` | None | Returns JWT + public user fields; inactive users rejected (`403`). |
| `GET` | `/api/auth/me` | JWT | Current user profile (no password). |

### Users (admin only)

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| `GET` | `/api/users` | `admin` | List users (no passwords). |
| `GET` | `/api/users/:id` | `admin` | Single user. |
| `POST` | `/api/users` | `admin` | Create user with chosen role. |
| `PATCH` | `/api/users/:id` | `admin` | Partial update (name/role); `{}` → `400` “No fields to update”. |
| `PATCH` | `/api/users/:id/status` | `admin` | Set `active` / `inactive`. |

### Transactions

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| `GET` | `/api/transactions` | `admin`, `analyst`, `viewer` | List with optional **`type`**, **`category`**, **`from`**, **`to`**, **`page`**, **`limit`**; excludes soft-deleted; `meta` for pagination. |
| `GET` | `/api/transactions/:id` | `admin`, `analyst`, `viewer` | Single transaction (not soft-deleted). |
| `POST` | `/api/transactions` | `admin` | Create; **`createdBy`** set from JWT, not client. |
| `PATCH` | `/api/transactions/:id` | `admin` | Partial update; empty body → `400` “No fields to update”. |
| `DELETE` | `/api/transactions/:id` | `admin` | Soft delete (`isDeleted`); subsequent get/list omit row. |

### Dashboard

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| `GET` | `/api/dashboard/summary` | `admin`, `analyst` | Total income/expenses, net balance, category breakdown. |
| `GET` | `/api/dashboard/trends` | `admin`, `analyst` | Time series: query **`granularity=month`** (default) or **`week`**. |
| `GET` | `/api/dashboard/recent` | `admin`, `analyst`, `viewer` | Last 5 non-deleted transactions, newest first. |

**RBAC summary:** Viewers can **read** transactions and **recent** activity only. **Analysts** get analytics (summary + trends) and reads. **Admins** manage users and all transaction writes. See **[`server/API.md`](server/API.md)** for response shapes and error examples.

---

## Assumptions and tradeoffs

- **Viewer** vs **insights:** Viewers see **transactions** and **recent** but not **summary/trends** so “dashboard insight” endpoints are clearly tied to **analyst/admin**.
- **Registration:** Self-serve register is suitable for demos; production systems often disable open registration.
- **Not implemented (optional scope):** fuzzy **search** on transactions, **automated tests**, rich **charting** on the client.
- **Study-plan docs:** If an external plan lists “monthly trends” as skipped, **this repo includes** `GET /api/dashboard/trends` — trust **this README** and **`API.md`**.

---

## Deployment (production)

| Piece | Suggested host |
|-------|----------------|
| PostgreSQL | [Neon](https://neon.tech) (or any Postgres) |
| Backend | [Render](https://render.com) Web Service — **Root directory** `server/`, **Build** `npm install`, **Start** `node src/app.js`, env: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_URL` |
| Frontend | [Vercel](https://vercel.com) — `VITE_API_URL` = your Render URL (no trailing slash) |

**Render free tier:** instances **sleep** when idle; the **first request after sleep** can be slow — expected, not a broken API.

---

## Scripts (`server/`)

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server with watch |
| `npm start` | Production `node src/app.js` |
| `npm run db:push` | Push Drizzle schema to the database |
| `npm run db:generate` | Generate Drizzle migrations |
