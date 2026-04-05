import * as authService from "../services/auth.service.js"
import { formatSuccess } from "../utils/formatResponse.js"

export const register = async (req, res, next) => {
  try {
    const user = await authService.registerUser(req.body)
    res.status(201).json(formatSuccess(user))
  } catch (err) {
    next(err)
  }
}

export const login = async (req, res, next) => {
  try {
    const result = await authService.loginUser(req.body)
    res.status(200).json(formatSuccess(result))
  } catch (err) {
    next(err)
  }
}

export const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.id)
    res.status(200).json(formatSuccess(user))
  } catch (err) {
    next(err)
  }
}
