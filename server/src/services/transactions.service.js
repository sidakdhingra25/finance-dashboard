import { eq, and, gte, lte, desc, count } from "drizzle-orm"
import { db } from "../config/db.js"
import { transactions } from "../db/schema.js"

const formatTransaction = (row) => ({
  ...row,
  amount: Number(row.amount)
})

export const getAllTransactions = async ({ type, category, from, to, page = 1, limit = 10 }) => {
  const conditions = [eq(transactions.isDeleted, false)]

  if (type) conditions.push(eq(transactions.type, type))
  if (category) conditions.push(eq(transactions.category, category))
  if (from) conditions.push(gte(transactions.date, from))
  if (to) conditions.push(lte(transactions.date, to))

  const totalResult = await db
    .select({ count: count() })
    .from(transactions)
    .where(and(...conditions))

  const total = Number(totalResult[0].count)

  const data = await db
    .select()
    .from(transactions)
    .where(and(...conditions))
    .orderBy(desc(transactions.createdAt))
    .limit(Number(limit))
    .offset((Number(page) - 1) * Number(limit))

  return {
    data: data.map(formatTransaction),
    meta: { page: Number(page), limit: Number(limit), total }
  }
}

export const getTransactionById = async (id) => {
  const [row] = await db
    .select()
    .from(transactions)
    .where(
      and(eq(transactions.id, id), eq(transactions.isDeleted, false))
    )
    .limit(1)

  if (!row) {
    throw { status: 404, message: "Transaction not found" }
  }

  return formatTransaction(row)
}

export const createTransaction = async (data) => {
  const [row] = await db.insert(transactions).values(data).returning()

  return formatTransaction(row)
}

export const updateTransaction = async (id, data) => {
  await getTransactionById(id)

  const patch = { ...data }
  for (const key of Object.keys(patch)) {
    if (patch[key] === undefined) delete patch[key]
  }

  if (Object.keys(patch).length === 0) {
    throw { status: 400, message: "No fields to update" }
  }

  const [row] = await db
    .update(transactions)
    .set({
      ...patch,
      updatedAt: new Date()
    })
    .where(
      and(eq(transactions.id, id), eq(transactions.isDeleted, false))
    )
    .returning()

  return formatTransaction(row)
}

export const deleteTransaction = async (id) => {
  await getTransactionById(id)

  await db
    .update(transactions)
    .set({ isDeleted: true, updatedAt: new Date() })
    .where(eq(transactions.id, id))

  return { message: "Transaction deleted successfully" }
}
