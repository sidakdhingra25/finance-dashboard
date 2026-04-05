import "dotenv/config"
import express from "express"
import cors from "cors"

import { ENV } from "./config/env.js"
import { errorHandler } from "./middleware/errorHandler.js"
import { authLimiter, apiLimiter } from "./middleware/rateLimiter.js"
import authRoutes from "./routes/auth.routes.js"
import userRoutes from "./routes/users.routes.js"
import transactionRoutes from "./routes/transactions.routes.js"
import dashboardRoutes from "./routes/dashboard.routes.js"

const app = express()

// ─── Core Middleware ──────────────────────────────────
app.use(cors({ origin: ENV.CLIENT_URL || "*" }))
app.use(express.json())

// ─── Rate Limiting ────────────────────────────────────
app.use("/api", apiLimiter)
app.use("/api/auth", authLimiter)

// ─── Health Check ─────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "OK" })
})

// ─── Routes (wired in later steps) ───────────────────
app.use("/api/auth", authRoutes)
app.use("/api/users", userRoutes)
app.use("/api/transactions", transactionRoutes)
app.use("/api/dashboard", dashboardRoutes)

// ─── Global Error Handler — must be last ─────────────
app.use(errorHandler)

// ─── Start Server ─────────────────────────────────────
app.listen(ENV.PORT, () => {
  console.log(`Server running on port ${ENV.PORT}`)
})

export default app
