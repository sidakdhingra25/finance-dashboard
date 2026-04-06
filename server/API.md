# Finance Dashboard API

Base URL (local): `http://localhost:5000`  
(Or set `PORT` in `.env`; default is `5000`.)

All JSON endpoints expect header: `Content-Type: application/json` where a body is sent.

---

## Standard response shapes

### Success (most API routes)

```json
{
  "success": true,
  "data": { }
}
```

Optional pagination or extra fields:

```json
{
  "success": true,
  "data": [ ],
  "meta": { "page": 1, "limit": 10, "total": 50 }
}
```

### Error (validation, auth, business logic, global handler)

```json
{
  "success": false,
  "message": "Human-readable message"
}
```

With field-level validation details:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": ["email: Invalid email", "password: Password is required"]
}
```

### Health check (exception)

The health route returns a plain object **without** `success` / `data` (see below).

---

## Rate limiting


| Scope         | Window     | Limit        | HTTP when exceeded |
| ------------- | ---------- | ------------ | ------------------ |
| All `/api/`*  | 15 minutes | 100 requests | `429`              |
| `/api/auth/*` | 15 minutes | 20 requests  | `429`              |


Requests under `/api/auth/*` match **both** scopes; each limiter tracks separately for the same client.

**429 response body:**

```json
{
  "success": false,
  "message": "Too many requests, please try again later"
}
```

---

## Endpoints

### `GET /api/health`

**Auth:** None  

**Description:** Liveness check for the API process.

**Response** `200 OK`

```json
{
  "status": "OK"
}
```

---

### `POST /api/auth/register`

**Auth:** None  

**Description:** Creates a user. The **first** user in the database becomes `admin`; everyone after is `viewer`.

**Request body**


| Field      | Type   | Rules                  |
| ---------- | ------ | ---------------------- |
| `name`     | string | Required, min length 1 |
| `email`    | string | Valid email format     |
| `password` | string | Min length 6           |


**Example — first user (becomes admin)**

Request:

```json
{
  "name": "Admin User",
  "email": "admin@test.com",
  "password": "admin123"
}
```

Response `201 Created`:

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Admin User",
    "email": "admin@test.com",
    "role": "admin",
    "status": "active"
  }
}
```

**Example — second user (becomes viewer)**

Request:

```json
{
  "name": "Viewer User",
  "email": "viewer@test.com",
  "password": "viewer123"
}
```

Response `201 Created`:

```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Viewer User",
    "email": "viewer@test.com",
    "role": "viewer",
    "status": "active"
  }
}
```

**Example — duplicate email**

Request (same `email` as an existing user):

```json
{
  "name": "Someone Else",
  "email": "admin@test.com",
  "password": "password123"
}
```

Response `400 Bad Request`:

```json
{
  "success": false,
  "message": "Email already in use"
}
```

**Example — validation failure**

Request:

```json
{
  "name": "",
  "email": "not-an-email",
  "password": "12345"
}
```

Response `400 Bad Request`:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "name: Name is required",
    "email: Invalid email",
    "password: Password must be at least 6 characters"
  ]
}
```

*(Exact `errors` strings may vary slightly with Zod version.)*

---

### `POST /api/auth/login`

**Auth:** None  

**Description:** Returns a JWT and public user fields. Inactive users cannot log in.

**Request body**


| Field      | Type   | Rules                   |
| ---------- | ------ | ----------------------- |
| `email`    | string | Valid email format      |
| `password` | string | Required (min length 1) |


**Example — success**

Request:

```json
{
  "email": "admin@test.com",
  "password": "admin123"
}
```

Response `200 OK`:

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Admin User",
      "email": "admin@test.com",
      "role": "admin",
      "status": "active"
    }
  }
}
```

**Example — validation failure**

Request:

```json
{
  "email": "notanemail",
  "password": ""
}
```

Response `400 Bad Request`:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "email: Invalid email",
    "password: Password is required"
  ]
}
```

**Example — wrong password**

Request:

```json
{
  "email": "admin@test.com",
  "password": "wrongpassword"
}
```

Response `401 Unauthorized`:

```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

**Example — unknown email**

Request:

```json
{
  "email": "nobody@example.com",
  "password": "anypassword"
}
```

Response `404 Not Found`:

```json
{
  "success": false,
  "message": "User not found"
}
```

**Example — inactive account**

After an admin sets that user’s status to `inactive` (see `PATCH /api/users/:id/status`), login with correct password:

Request:

```json
{
  "email": "viewer@test.com",
  "password": "viewer123"
}
```

Response `403 Forbidden`:

```json
{
  "success": false,
  "message": "Account is inactive"
}
```

---

### `GET /api/auth/me`

**Auth:** Required — JWT bearer token  

**Header**

```http
Authorization: Bearer <token>
```

**Description:** Returns the current user (from token payload `id`). Password is never returned.

**Response** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Admin User",
    "email": "admin@test.com",
    "role": "admin",
    "status": "active",
    "createdAt": "2026-04-06T12:00:00.000Z"
  }
}
```

`createdAt` is an ISO timestamp string as returned by the database driver.

**Example — no token**

Request: omit `Authorization` (or send empty).

Response `401 Unauthorized`:

```json
{
  "success": false,
  "message": "No token provided"
}
```

**Example — invalid or expired token**

Request:

```http
Authorization: Bearer invalid.token.here
```

Response `401 Unauthorized`:

```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

**Example — user deleted from DB but token still valid**

Response `404 Not Found`:

```json
{
  "success": false,
  "message": "User not found"
}
```

---

## JWT payload

Tokens issued by login include at least:

```json
{
  "id": "<user-uuid>",
  "role": "admin | analyst | viewer"
}
```

Use `Authorization: Bearer <token>` for `GET /api/auth/me`, `/api/users`, `/api/transactions`, `/api/dashboard`, and any other protected routes.

---

## User management (`/api/users`)

**Auth:** JWT required on every route. **Role:** `admin` only.

If the caller’s role is not `admin` (e.g. `viewer` or `analyst`):

Response `403 Forbidden`:

```json
{
  "success": false,
  "message": "Access denied"
}
```

If the token is missing or invalid, responses match `/api/auth/me` (`401`).

User objects in responses **never** include `password`.

---

### `GET /api/users`

**Headers**

```http
Authorization: Bearer <admin_token>
```

**Response** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Admin User",
      "email": "admin@test.com",
      "role": "admin",
      "status": "active",
      "createdAt": "2026-04-06T12:00:00.000Z"
    }
  ]
}
```

List is ordered by `createdAt` ascending.

---

### `GET /api/users/:id`

**Headers**

```http
Authorization: Bearer <admin_token>
```

**Response** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Viewer User",
    "email": "viewer@test.com",
    "role": "viewer",
    "status": "active",
    "createdAt": "2026-04-06T12:30:00.000Z"
  }
}
```

**Example — unknown id**

Response `404 Not Found`:

```json
{
  "success": false,
  "message": "User not found"
}
```

---

### `POST /api/users`

**Headers**

```http
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request body**


| Field      | Type   | Rules                          |
| ---------- | ------ | ------------------------------ |
| `name`     | string | Required, min length 1         |
| `email`    | string | Valid email                    |
| `password` | string | Min length 6                   |
| `role`     | string | `viewer` | `analyst` | `admin` |


**Example — create analyst**

Request:

```json
{
  "name": "Analyst User",
  "email": "analyst@test.com",
  "password": "analyst123",
  "role": "analyst"
}
```

Response `201 Created`:

```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "name": "Analyst User",
    "email": "analyst@test.com",
    "role": "analyst",
    "status": "active"
  }
}
```

**Example — duplicate email**

Response `400 Bad Request`:

```json
{
  "success": false,
  "message": "Email already in use"
}
```

**Example — validation (invalid role)**

Request:

```json
{
  "name": "X",
  "email": "x@test.com",
  "password": "secret12",
  "role": "superuser"
}
```

Response `400 Bad Request` — `errors` include a message such as `Invalid role` (exact wording depends on Zod).

---

### `PATCH /api/users/:id`

**Headers**

```http
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request body** — at least one of `name` or `role` must be present after validation. Sending neither (e.g. `{}`) returns `400`.


| Field  | Type   | Rules                                    |
| ------ | ------ | ---------------------------------------- |
| `name` | string | Optional; if present, min length 1       |
| `role` | string | Optional; `viewer` | `analyst` | `admin` |


**Example — success**

Request:

```json
{
  "name": "Updated Name",
  "role": "analyst"
}
```

Response `200 OK`:

```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Updated Name",
    "email": "viewer@test.com",
    "role": "analyst",
    "status": "active"
  }
}
```

**Example — no fields to update**

Request:

```json
{}
```

Response `400 Bad Request`:

```json
{
  "success": false,
  "message": "No fields to update"
}
```

---

### `PATCH /api/users/:id/status`

**Headers**

```http
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request body**


| Field    | Type   | Rules                  |
| -------- | ------ | ---------------------- |
| `status` | string | `active` or `inactive` |


**Example — deactivate**

Request:

```json
{
  "status": "inactive"
}
```

Response `200 OK`:

```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Viewer User",
    "email": "viewer@test.com",
    "role": "viewer",
    "status": "inactive"
  }
}
```

After this, that user receives `403` with `"Account is inactive"` on `POST /api/auth/login` (see auth section).

**Example — validation**

Request:

```json
{
  "status": "banned"
}
```

Response `400 Bad Request` with `"Validation failed"` and `errors` (invalid status).

---

## Transactions (`/api/transactions`)

**Auth:** JWT required on every route.


| Capability                            | Roles                        |
| ------------------------------------- | ---------------------------- |
| `GET /`, `GET /:id`                   | `admin`, `analyst`, `viewer` |
| `POST /`, `PATCH /:id`, `DELETE /:id` | `admin` only                 |


Non-admin write attempts receive `403`:

```json
{
  "success": false,
  "message": "Access denied"
}
```

Soft-deleted rows (`isDeleted: true`) are hidden from list/get and cannot be updated again via these endpoints.

`**amount**` is always returned as a **number** in JSON (not a string), even though PostgreSQL stores it as `numeric`.

`createdBy` is set **only** from the JWT on create; the client must not rely on sending it (it is ignored if sent — the server overwrites with `req.user.id`).

---

### `GET /api/transactions`

**Headers:** `Authorization: Bearer <token>`

**Query parameters (all optional)**


| Param      | Example      | Effect                          |
| ---------- | ------------ | ------------------------------- |
| `type`     | `income`     | Filter by `income` or `expense` |
| `category` | `rent`       | Exact category match            |
| `from`     | `2024-03-01` | Inclusive lower bound on `date` |
| `to`       | `2024-03-31` | Inclusive upper bound on `date` |
| `page`     | `1`          | Page number (default `1`)       |
| `limit`    | `10`         | Page size (default `10`)        |


**Response** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440010",
      "amount": 5000,
      "type": "income",
      "category": "salary",
      "date": "2024-03-01",
      "notes": "March salary",
      "createdBy": "550e8400-e29b-41d4-a716-446655440000",
      "isDeleted": false,
      "createdAt": "2026-04-06T12:00:00.000Z",
      "updatedAt": "2026-04-06T12:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 2,
    "total": 4
  }
}
```

Results are ordered by `createdAt` descending (newest first).

---

### `GET /api/transactions/:id`

**Headers:** `Authorization: Bearer <token>`

**Response** `200 OK` — single transaction object (same shape as one element in the list above).

**Example — not found or soft-deleted**

Response `404 Not Found`:

```json
{
  "success": false,
  "message": "Transaction not found"
}
```

---

### `POST /api/transactions`

**Headers:** `Authorization: Bearer <admin_token>` · `Content-Type: application/json`

**Request body**


| Field      | Type   | Rules                              |
| ---------- | ------ | ---------------------------------- |
| `amount`   | number | Must be positive                   |
| `type`     | string | `income` or `expense`              |
| `category` | string | Required, min length 1             |
| `date`     | string | Parseable date (e.g. `2024-03-01`) |
| `notes`    | string | Optional                           |


**Example**

```json
{
  "amount": 5000,
  "type": "income",
  "category": "salary",
  "date": "2024-03-01",
  "notes": "March salary"
}
```

**Response** `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440010",
    "amount": 5000,
    "type": "income",
    "category": "salary",
    "date": "2024-03-01",
    "notes": "March salary",
    "createdBy": "550e8400-e29b-41d4-a716-446655440000",
    "isDeleted": false,
    "createdAt": "2026-04-06T12:00:00.000Z",
    "updatedAt": "2026-04-06T12:00:00.000Z"
  }
}
```

**Example — validation failure**

Request:

```json
{
  "amount": -100,
  "type": "wrong",
  "category": "",
  "date": "notadate"
}
```

Response `400 Bad Request` — `"Validation failed"` with an `errors` array (messages from Zod).

**Example — viewer / analyst POST**

Response `403 Forbidden` — same shape as other RBAC denials.

---

### `PATCH /api/transactions/:id`

**Headers:** `Authorization: Bearer <admin_token>` · `Content-Type: application/json`

**Request body** — send only fields to change. At least one of the fields below must be present; `{}` returns `400` `"No fields to update"` (no DB write).


| Field      | Type   | Rules                        |
| ---------- | ------ | ---------------------------- |
| `amount`   | number | If present, must be positive |
| `type`     | string | `income` or `expense`        |
| `category` | string | If present, min length 1     |
| `date`     | string | If present, must parse       |
| `notes`    | string | Optional                     |


**Example**

```json
{
  "amount": 5500,
  "notes": "Updated salary"
}
```

**Response** `200 OK` — full updated transaction object (`amount` as number).

**Example — no fields to update**

Request:

```json
{}
```

Response `400 Bad Request`:

```json
{
  "success": false,
  "message": "No fields to update"
}
```

No row is written; `updatedAt` is unchanged.

**Errors:** `400` validation or empty body (above), `403` non-admin, `404` if missing or already soft-deleted.

---

### `DELETE /api/transactions/:id`

**Headers:** `Authorization: Bearer <admin_token>`

**Description:** Soft delete (`isDeleted` set to `true`).

**Response** `200 OK`

```json
{
  "success": true,
  "data": {
    "message": "Transaction deleted successfully"
  }
}
```

After delete, `GET /api/transactions/:id` returns `404`.

---

## Dashboard (`/api/dashboard`)

Aggregations use only rows where `**isDeleted` is false** (same as list/get transactions). Soft-deleted rows are excluded from **summary**, **trends**, and **recent**.

---

### `GET /api/dashboard/summary`

**Auth:** JWT required. **Roles:** `admin`, `analyst` only.

**Headers:** `Authorization: Bearer <token>`

**Description:** Totals for income and expenses, net balance, and per **category + type** breakdown. `byCategory` is ordered by total amount descending.

**Response** `200 OK`

```json
{
  "success": true,
  "data": {
    "totalIncome": 13000,
    "totalExpenses": 1500,
    "netBalance": 11500,
    "byCategory": [
      { "category": "salary", "type": "income", "total": 13000 },
      { "category": "rent", "type": "expense", "total": 1200 },
      { "category": "food", "type": "expense", "total": 300 }
    ]
  }
}
```

All numeric totals are **numbers** in JSON.

**Example — viewer / insufficient role**

Response `403 Forbidden`:

```json
{
  "success": false,
  "message": "Access denied"
}
```

**Example — missing / invalid token**

Response `401 Unauthorized` (same shape as other protected routes).

---

### `GET /api/dashboard/trends`

**Auth:** JWT required. **Roles:** `admin`, `analyst` only (same as `/summary`).

**Headers:** `Authorization: Bearer <token>`

**Query parameters**


| Param         | Values          | Default |
| ------------- | --------------- | ------- |
| `granularity` | `month`, `week` | `month` |


- `**month`** — `period` is `**YYYY-MM**` (calendar month of `transactions.date`).
- `**week**` — `period` is the **Monday** of the week containing `transactions.date`, formatted `**YYYY-MM-DD`**, using PostgreSQL `date_trunc('week', ...)`.

**Response** `200 OK`

```json
{
  "success": true,
  "data": {
    "granularity": "month",
    "series": [
      {
        "period": "2024-03",
        "income": 5000,
        "expenses": 1500,
        "net": 3500
      },
      {
        "period": "2024-04",
        "income": 8000,
        "expenses": 0,
        "net": 8000
      }
    ]
  }
}
```

`series` is ordered by `period` ascending. Only periods with at least one non-deleted transaction appear. All amounts are **numbers**.

**Examples**

- `GET /api/dashboard/trends`
- `GET /api/dashboard/trends?granularity=month`
- `GET /api/dashboard/trends?granularity=week`

**Invalid `granularity`**

Response `400 Bad Request`:

```json
{
  "success": false,
  "message": "Invalid granularity. Use \"month\" or \"week\"."
}
```

**403 / 401** — Same as `/summary` when role or token is insufficient.

---

### `GET /api/dashboard/recent`

**Auth:** JWT required. **Roles:** `admin`, `analyst`, `viewer`.

**Headers:** `Authorization: Bearer <token>`

**Description:** Up to **5** most recent non-deleted transactions, `**createdAt` descending** (newest first). Each `amount` is a **number**.

**Response** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440010",
      "amount": 8000,
      "type": "income",
      "category": "salary",
      "date": "2024-04-01",
      "notes": null,
      "createdBy": "550e8400-e29b-41d4-a716-446655440000",
      "isDeleted": false,
      "createdAt": "2026-04-06T14:00:00.000Z",
      "updatedAt": "2026-04-06T14:00:00.000Z"
    }
  ]
}
```

If there are fewer than five transactions, `data` contains only those rows (possibly empty array).

---

## Testing checklist (quick reference)


| Step | Method & path                                | Notes                                                      |
| ---- | -------------------------------------------- | ---------------------------------------------------------- |
| 1    | `GET /api/health`                            | Expect `{ "status": "OK" }`                                |
| 2    | `POST /api/auth/register`                    | First user → `role: admin`                                 |
| 3    | `POST /api/auth/register`                    | Second email → `role: viewer`                              |
| 4    | `POST /api/auth/register`                    | Duplicate email → `400`                                    |
| 5    | `POST /api/auth/login`                       | Valid credentials → `token` + `user`                       |
| 6    | `POST /api/auth/login`                       | Wrong password → `401`                                     |
| 7    | `POST /api/auth/login`                       | Unknown email → `404`                                      |
| 8    | `GET /api/auth/me`                           | Bearer admin token → `200`                                 |
| 9    | `GET /api/auth/me`                           | No / bad token → `401`                                     |
| 10   | `GET /api/users`                             | Admin token → `200` array                                  |
| 11   | `GET /api/users`                             | Viewer token → `403` Access denied                         |
| 12   | `POST /api/users`                            | Admin creates analyst → `201`                              |
| 13   | `PATCH /api/users/:id/status`                | `inactive` → then login that user → `403` inactive         |
| 14   | `POST /api/transactions`                     | Admin → `201`, `amount` number, `createdBy` = your user id |
| 15   | `GET /api/transactions?type=income`          | Filter smoke test                                          |
| 16   | `GET /api/transactions?from=...&to=...`      | Date range                                                 |
| 17   | `GET /api/transactions?page=1&limit=2`       | `meta.total` matches non-deleted rows                      |
| 18   | `PATCH /api/transactions/:id`                | Admin updates fields                                       |
| 19   | `DELETE /api/transactions/:id`               | Then `GET` same id → `404`                                 |
| 20   | `POST /api/transactions`                     | Viewer token → `403`                                       |
| 21   | `GET /api/dashboard/summary`                 | Admin/analyst → totals + `byCategory`                      |
| 22   | `GET /api/dashboard/trends`                  | `granularity=month` → series by `YYYY-MM`                  |
| 23   | `GET /api/dashboard/trends?granularity=week` | Series by week (Monday key)                                |
| 24   | `GET /api/dashboard/trends?granularity=bad`  | `400` invalid granularity                                  |
| 25   | `GET /api/dashboard/summary`                 | Viewer token → `403`                                       |
| 26   | `GET /api/dashboard/recent`                  | Any role → ≤5 rows, newest first                           |
| 27   | After `DELETE` a transaction                 | `/summary`, `/trends`, `/recent` exclude it                |
| 28   | Rate limiting                                | Many rapid `/api/auth` calls → `429`                       |


