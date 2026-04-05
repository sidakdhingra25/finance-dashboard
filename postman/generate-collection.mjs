/**
 * One-off generator: node generate-collection.mjs
 * Writes Finance-Dashboard.postman_collection.json
 */
import { writeFileSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))

const jsonHeader = [
  { key: "Content-Type", value: "application/json", type: "text" },
]

/** Authorization is applied by collection pre-request script (except public / special cases). */
function req(name, method, path, opts = {}) {
  const { body, query, headers = [], testScript } = opts
  const h = [...headers]
  if (body && !h.some((x) => x.key === "Content-Type")) h.push(...jsonHeader)

  let url = `{{baseUrl}}${path}`
  if (query) url += `?${query}`

  const item = {
    name,
    request: {
      method,
      header: h,
      url,
    },
  }
  if (body) {
    item.request.body = {
      mode: "raw",
      raw: JSON.stringify(body, null, 2),
    }
  }
  if (testScript) {
    item.event = [
      {
        listen: "test",
        script: {
          exec: testScript.split("\n"),
          type: "text/javascript",
        },
      },
    ]
  }
  return item
}

const prerequestScript = `
const url = (pm.request.url && pm.request.url.toString)
  ? pm.request.url.toString()
  : String(pm.request.url || "");
const name = pm.info.requestName || "";

// Public endpoints — never attach JWT
if (
  url.indexOf("/api/health") !== -1 ||
  url.indexOf("/api/auth/register") !== -1 ||
  url.indexOf("/api/auth/login") !== -1
) {
  return;
}

// Missing-auth negative test (expect 401)
if (name.indexOf("(expect 401)") !== -1 || name.indexOf("no Authorization") !== -1) {
  pm.request.headers.remove("Authorization");
  return;
}

// RBAC: viewer must not create transactions (expect 403)
if (name.indexOf("viewer (expect 403)") !== -1) {
  const vt = pm.collectionVariables.get("viewerToken");
  if (vt) {
    pm.request.headers.upsert({
      key: "Authorization",
      value: "Bearer " + vt,
    });
  } else {
    pm.request.headers.remove("Authorization");
  }
  return;
}

// Default: admin/session token for all other protected routes
const t = pm.collectionVariables.get("token");
if (t) {
  pm.request.headers.upsert({
    key: "Authorization",
    value: "Bearer " + t,
  });
}
`.trim()

const loginTestScript = `try {
  const j = pm.response.json();
  if (j && j.success && j.data && j.data.token) {
    pm.collectionVariables.set("token", j.data.token);
  }
  if (j && j.data && j.data.user && j.data.user.id) {
    pm.collectionVariables.set("userId", j.data.user.id);
  }
} catch (e) {}`

const viewerLoginTestScript = `try {
  const j = pm.response.json();
  if (j && j.success && j.data && j.data.token) {
    pm.collectionVariables.set("viewerToken", j.data.token);
  }
} catch (e) {}`

const createTxTestScript = `try {
  const j = pm.response.json();
  if (j && j.success && j.data && j.data.id) {
    pm.collectionVariables.set("transactionId", j.data.id);
  }
} catch (e) {}`

const collection = {
  info: {
    _postman_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    name: "Finance Dashboard API",
    description:
      "Aligned with `server/API.md`. Includes authentication flow, RBAC validation, error scenarios, and end-to-end API testing.\n\n**Variables:** `baseUrl`, `token`, `viewerToken`, `userId`, `viewerUserId`, `transactionId`.\n\n1. **02 Auth → Login** sets `token` / `userId`. **Login (viewer)** sets `viewerToken` (needed for **06** RBAC test).\n2. **Users → List** — paste a viewer id into **`viewerUserId`** for PATCH status.\n3. **Transactions → POST Create** sets `transactionId` for GET/PUT/DELETE.\n\nCollection **pre-request script** attaches `Authorization: Bearer <token>` automatically (except public routes, no-auth tests, and viewer-403 test). Register may return 400 if emails already exist.",
    schema:
      "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  event: [
    {
      listen: "prerequest",
      script: {
        exec: prerequestScript.split("\n"),
        type: "text/javascript",
      },
    },
  ],
  variable: [
    {
      key: "baseUrl",
      value: "https://finance-dashboard-api-vwow.onrender.com",
    },
    { key: "token", value: "" },
    {
      key: "viewerToken",
      value: "",
      description: "Set by **Login (viewer)**. Used for viewer → 403 RBAC test.",
    },
    {
      key: "userId",
      value: "",
      description: "Set by Login (logged-in user). Used for GET user by id / PUT.",
    },
    {
      key: "viewerUserId",
      value: "",
      description:
        "Paste a viewer user's id from **List users** before PATCH status (avoid deactivating your admin).",
    },
    {
      key: "transactionId",
      value: "",
      description: "Set by **Transactions → POST Create**.",
    },
  ],
  item: [
    {
      name: "01 Health",
      item: [req("GET /api/health", "GET", "/api/health")],
    },
    {
      name: "02 Auth",
      item: [
        req("POST Register (first user → admin)", "POST", "/api/auth/register", {
          body: {
            name: "Admin User",
            email: "admin@test.com",
            password: "admin123",
          },
        }),
        req("POST Register (second user → viewer)", "POST", "/api/auth/register", {
          body: {
            name: "Viewer User",
            email: "viewer@test.com",
            password: "viewer123",
          },
        }),
        req("POST Login (admin)", "POST", "/api/auth/login", {
          body: { email: "admin@test.com", password: "admin123" },
          testScript: loginTestScript,
        }),
        req("POST Login (viewer — saves viewerToken)", "POST", "/api/auth/login", {
          body: { email: "viewer@test.com", password: "viewer123" },
          testScript: viewerLoginTestScript,
        }),
        req("GET Me", "GET", "/api/auth/me"),
      ],
    },
    {
      name: "03 Users (admin only)",
      item: [
        req("GET List users", "GET", "/api/users"),
        req("GET User by id", "GET", "/api/users/{{userId}}"),
        req("POST Create user (analyst)", "POST", "/api/users", {
          body: {
            name: "Analyst User",
            email: "analyst@test.com",
            password: "analyst123",
            role: "analyst",
          },
        }),
        req("PUT Update user", "PUT", "/api/users/{{userId}}", {
          body: { name: "Updated Name", role: "analyst" },
        }),
        req(
          "PATCH User status (inactive) — uses viewerUserId",
          "PATCH",
          "/api/users/{{viewerUserId}}/status",
          { body: { status: "inactive" } }
        ),
        req(
          "PATCH User status (active) — uses viewerUserId",
          "PATCH",
          "/api/users/{{viewerUserId}}/status",
          { body: { status: "active" } }
        ),
      ],
    },
    {
      name: "04 Transactions",
      item: [
        req("GET List (all)", "GET", "/api/transactions"),
        req(
          "GET List (filters + pagination)",
          "GET",
          "/api/transactions",
          {
            query:
              "type=income&category=salary&from=2024-03-01&to=2024-12-31&page=1&limit=10",
          }
        ),
        req("POST Create", "POST", "/api/transactions", {
          body: {
            amount: 5000,
            type: "income",
            category: "salary",
            date: "2024-03-01",
            notes: "March salary",
          },
          testScript: createTxTestScript,
        }),
        req("POST Create (expense sample)", "POST", "/api/transactions", {
          body: {
            amount: 1200,
            type: "expense",
            category: "rent",
            date: "2024-03-05",
          },
        }),
        req("GET By id", "GET", "/api/transactions/{{transactionId}}"),
        req("PUT Update", "PUT", "/api/transactions/{{transactionId}}", {
          body: { amount: 5500, notes: "Updated salary" },
        }),
        req("DELETE Soft delete", "DELETE", "/api/transactions/{{transactionId}}"),
      ],
    },
    {
      name: "05 Dashboard",
      item: [
        req("GET Summary", "GET", "/api/dashboard/summary"),
        req("GET Trends (month, default)", "GET", "/api/dashboard/trends"),
        req("GET Trends (week)", "GET", "/api/dashboard/trends", {
          query: "granularity=week",
        }),
        req("GET Recent", "GET", "/api/dashboard/recent"),
      ],
    },
    {
      name: "06 Error & security examples",
      item: [
        req(
          "POST Login — wrong password (expect 401)",
          "POST",
          "/api/auth/login",
          {
            body: { email: "admin@test.com", password: "wrongpass" },
          }
        ),
        req(
          "POST Create transaction — invalid body (expect 400)",
          "POST",
          "/api/transactions",
          {
            body: { amount: -100, type: "income" },
          }
        ),
        req(
          "GET Me — no Authorization (expect 401)",
          "GET",
          "/api/auth/me"
        ),
        req(
          "POST /api/transactions — viewer (expect 403)",
          "POST",
          "/api/transactions",
          {
            body: {
              amount: 100,
              type: "income",
              category: "test",
              date: "2024-06-01",
            },
          }
        ),
      ],
    },
  ],
}

const out = join(__dirname, "Finance-Dashboard.postman_collection.json")
writeFileSync(out, JSON.stringify(collection, null, 2), "utf8")
console.log("Wrote", out)
