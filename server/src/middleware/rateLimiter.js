import rateLimit from "express-rate-limit"
import { formatError } from "../utils/formatResponse.js"

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(formatError("Too many requests, please try again later"))
  }
})

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(formatError("Too many requests, please try again later"))
  }
})
