import * as dashboardService from "../services/dashboard.service.js"
import { formatSuccess } from "../utils/formatResponse.js"

export const getSummary = async (req, res, next) => {
  try {
    const data = await dashboardService.getSummary()
    res.status(200).json(formatSuccess(data))
  } catch (err) {
    next(err)
  }
}

export const getRecent = async (req, res, next) => {
  try {
    const data = await dashboardService.getRecent()
    res.status(200).json(formatSuccess(data))
  } catch (err) {
    next(err)
  }
}

export const getTrends = async (req, res, next) => {
  try {
    const data = await dashboardService.getTrends(req.query.granularity)
    res.status(200).json(formatSuccess(data))
  } catch (err) {
    next(err)
  }
}
