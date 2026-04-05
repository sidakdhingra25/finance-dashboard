import jwt from "jsonwebtoken"
import { ENV } from "../config/env.js"
import { formatError } from "../utils/formatResponse.js"

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json(formatError("No token provided"))
  }

  const token = authHeader.split(" ")[1]

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    return res.status(401).json(formatError("Invalid or expired token"))
  }
}
