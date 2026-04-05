import { eq, desc, sql, asc } from "drizzle-orm"
import { db } from "../config/db.js"
import { transactions } from "../db/schema.js"

export const getSummary = async () => {
  const [totals] = await db
    .select({
      totalIncome: sql`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END), 0)`,
      totalExpenses: sql`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)`
    })
    .from(transactions)
    .where(eq(transactions.isDeleted, false))

  const totalIncome = Number(totals.totalIncome)
  const totalExpenses = Number(totals.totalExpenses)
  const netBalance = totalIncome - totalExpenses

  const categoryTotals = await db
    .select({
      category: transactions.category,
      type: transactions.type,
      total: sql`SUM(${transactions.amount})`
    })
    .from(transactions)
    .where(eq(transactions.isDeleted, false))
    .groupBy(transactions.category, transactions.type)
    .orderBy(desc(sql`SUM(${transactions.amount})`))

  return {
    totalIncome,
    totalExpenses,
    netBalance,
    byCategory: categoryTotals.map((row) => ({
      category: row.category,
      type: row.type,
      total: Number(row.total)
    }))
  }
}

export const getRecent = async () => {
  const rows = await db
    .select()
    .from(transactions)
    .where(eq(transactions.isDeleted, false))
    .orderBy(desc(transactions.createdAt))
    .limit(5)

  return rows.map((row) => ({
    ...row,
    amount: Number(row.amount)
  }))
}

/**
 * Time-series totals by calendar month or by week (PostgreSQL date_trunc).
 * Query param granularity: "month" (default) | "week"
 * - month: period is "YYYY-MM"
 * - week: period is Monday start date "YYYY-MM-DD" of that week
 */
export const getTrends = async (granularity = "month") => {
  const g = String(granularity || "month").toLowerCase()
  if (g !== "month" && g !== "week") {
    throw {
      status: 400,
      message: 'Invalid granularity. Use "month" or "week".'
    }
  }

  const periodSql =
    g === "week"
      ? sql`to_char(date_trunc('week', ${transactions.date}::timestamp), 'YYYY-MM-DD')`
      : sql`to_char(${transactions.date}, 'YYYY-MM')`

  const rows = await db
    .select({
      period: periodSql,
      income: sql`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END), 0)`,
      expenses: sql`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)`
    })
    .from(transactions)
    .where(eq(transactions.isDeleted, false))
    .groupBy(periodSql)
    .orderBy(asc(periodSql))

  return {
    granularity: g,
    series: rows.map((row) => {
      const income = Number(row.income)
      const expenses = Number(row.expenses)
      return {
        period: row.period,
        income,
        expenses,
        net: income - expenses
      }
    })
  }
}
