import bcrypt from "bcryptjs"
import { eq } from "drizzle-orm"
import { db } from "../config/db.js"
import { users } from "../db/schema.js"
import { generateToken } from "../utils/generateToken.js"
import { ROLES, STATUS } from "../utils/constants.js"

export const registerUser = async ({ name, email, password }) => {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  if (existing.length > 0) {
    throw { status: 400, message: "Email already in use" }
  }

  const allUsers = await db.select().from(users).limit(1)
  const role = allUsers.length === 0 ? ROLES.ADMIN : ROLES.VIEWER

  const hashedPassword = await bcrypt.hash(password, 10)

  const [newUser] = await db
    .insert(users)
    .values({ name, email, password: hashedPassword, role })
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status
    })

  return newUser
}

export const loginUser = async ({ email, password }) => {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  if (!user) {
    throw { status: 404, message: "User not found" }
  }

  if (user.status === STATUS.INACTIVE) {
    throw { status: 403, message: "Account is inactive" }
  }

  const isMatch = await bcrypt.compare(password, user.password)
  if (!isMatch) {
    throw { status: 401, message: "Invalid credentials" }
  }

  const token = generateToken({ id: user.id, role: user.role })

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    }
  }
}

export const getMe = async (userId) => {
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      createdAt: users.createdAt
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) {
    throw { status: 404, message: "User not found" }
  }

  return user
}
