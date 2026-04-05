import jwt from "jsonwebtoken"
import { ENV } from "../config/env.js"

export const generateToken = (payload) => {
  return jwt.sign(payload, ENV.JWT_SECRET, {
    expiresIn: ENV.JWT_EXPIRES_IN
  })
}
