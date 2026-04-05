import { drizzle } from "drizzle-orm/node-postgres"
import pkg from "pg"
const { Pool } = pkg

import { ENV } from "./env.js"

const pool = new Pool({
  connectionString: ENV.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

export const db = drizzle(pool)
