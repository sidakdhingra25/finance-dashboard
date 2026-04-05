import { formatError } from "../utils/formatResponse.js"

export const errorHandler = (err, req, res, next) => {
  const status = err.status || 500
  const message = err.message || "Internal Server Error"
  const errors = err.errors || null

  res.status(status).json(formatError(message, errors))
}
