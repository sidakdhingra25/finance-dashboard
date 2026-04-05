import * as transactionsService from "../services/transactions.service.js"
import { formatSuccess } from "../utils/formatResponse.js"

export const getAllTransactions = async (req, res, next) => {
  try {
    const { type, category, from, to, page, limit } = req.query
    const result = await transactionsService.getAllTransactions({
      type,
      category,
      from,
      to,
      page,
      limit
    })
    res.status(200).json(formatSuccess(result.data, result.meta))
  } catch (err) {
    next(err)
  }
}

export const getTransactionById = async (req, res, next) => {
  try {
    const data = await transactionsService.getTransactionById(req.params.id)
    res.status(200).json(formatSuccess(data))
  } catch (err) {
    next(err)
  }
}

export const createTransaction = async (req, res, next) => {
  try {
    const data = await transactionsService.createTransaction({
      ...req.body,
      createdBy: req.user.id
    })
    res.status(201).json(formatSuccess(data))
  } catch (err) {
    next(err)
  }
}

export const updateTransaction = async (req, res, next) => {
  try {
    const data = await transactionsService.updateTransaction(
      req.params.id,
      req.body
    )
    res.status(200).json(formatSuccess(data))
  } catch (err) {
    next(err)
  }
}

export const deleteTransaction = async (req, res, next) => {
  try {
    const data = await transactionsService.deleteTransaction(req.params.id)
    res.status(200).json(formatSuccess(data))
  } catch (err) {
    next(err)
  }
}
