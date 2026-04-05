import { formatError } from "../utils/formatResponse.js"

export const requireRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(formatError("Unauthorized"))
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json(formatError("Access denied"))
    }

    next()
  }
}
