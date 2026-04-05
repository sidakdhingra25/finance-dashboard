import { z } from "zod"

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["viewer", "analyst", "admin"], { message: "Invalid role" })
})

export const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  role: z.enum(["viewer", "analyst", "admin"], { message: "Invalid role" }).optional()
})

export const updateStatusSchema = z.object({
  status: z.enum(["active", "inactive"], { message: "Invalid status" })
})
