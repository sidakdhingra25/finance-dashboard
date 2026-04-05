import { formatError } from "../utils/formatResponse.js"

export const validate = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body)

    if (!result.success) {
      const errors = result.error.issues.map((e) => {
        const path = Array.isArray(e.path) ? e.path.join(".") : String(e.path ?? "")
        return path ? `${path}: ${e.message}` : e.message
      })
      return res.status(400).json(formatError("Validation failed", errors))
    }

    req.body = result.data
    next()
  }
}
