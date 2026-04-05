import bcrypt from "bcryptjs"
import { eq } from "drizzle-orm"
import { db } from "../config/db.js"
import { users } from "../db/schema.js"

export const getAllUsers = async () => {
  return await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      createdAt: users.createdAt
    })
    .from(users)
    .orderBy(users.createdAt)
}

export const getUserById = async (id) => {
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
    .where(eq(users.id, id))
    .limit(1)

  if (!user) {
    throw { status: 404, message: "User not found" }
  }

  return user
}

export const createUser = async ({ name, email, password, role }) => {
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  if (existing) {
    throw { status: 400, message: "Email already in use" }
  }

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

export const updateUser = async (id, { name, role }) => {
  await getUserById(id)

  const patch = {}
  if (name !== undefined) patch.name = name
  if (role !== undefined) patch.role = role

  if (Object.keys(patch).length === 0) {
    throw { status: 400, message: "No fields to update" }
  }

  const [updated] = await db
    .update(users)
    .set(patch)
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status
    })

  return updated
}

export const updateUserStatus = async (id, status) => {
  await getUserById(id)

  const [updated] = await db
    .update(users)
    .set({ status })
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status
    })

  return updated
}
