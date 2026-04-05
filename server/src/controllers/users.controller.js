import * as usersService from "../services/users.service.js"
import { formatSuccess } from "../utils/formatResponse.js"

export const getAllUsers = async (req, res, next) => {
  try {
    const data = await usersService.getAllUsers()
    res.status(200).json(formatSuccess(data))
  } catch (err) {
    next(err)
  }
}

export const getUserById = async (req, res, next) => {
  try {
    const data = await usersService.getUserById(req.params.id)
    res.status(200).json(formatSuccess(data))
  } catch (err) {
    next(err)
  }
}

export const createUser = async (req, res, next) => {
  try {
    const data = await usersService.createUser(req.body)
    res.status(201).json(formatSuccess(data))
  } catch (err) {
    next(err)
  }
}

export const updateUser = async (req, res, next) => {
  try {
    const data = await usersService.updateUser(req.params.id, req.body)
    res.status(200).json(formatSuccess(data))
  } catch (err) {
    next(err)
  }
}

export const updateStatus = async (req, res, next) => {
  try {
    const data = await usersService.updateUserStatus(req.params.id, req.body.status)
    res.status(200).json(formatSuccess(data))
  } catch (err) {
    next(err)
  }
}
