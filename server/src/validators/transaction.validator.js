import { z } from "zod"

export const createTransactionSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  type: z.enum(["income", "expense"], { message: "Invalid type" }),
  category: z.string().min(1, "Category is required"),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date"
  }),
  notes: z.string().optional()
})

export const updateTransactionSchema = z.object({
  amount: z.number().positive("Amount must be positive").optional(),
  type: z.enum(["income", "expense"], { message: "Invalid type" }).optional(),
  category: z.string().min(1, "Category is required").optional(),
  date: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid date"
    })
    .optional(),
  notes: z.string().optional()
})
