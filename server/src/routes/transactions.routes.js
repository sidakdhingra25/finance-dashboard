import { Router } from "express"
import {
  getAllTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction
} from "../controllers/transactions.controller.js"
import { authMiddleware } from "../middleware/auth.js"
import { requireRoles } from "../middleware/rbac.js"
import { validate } from "../middleware/validate.js"
import {
  createTransactionSchema,
  updateTransactionSchema
} from "../validators/transaction.validator.js"
import { ROLES } from "../utils/constants.js"

const router = Router()

const ALL_ROLES = [ROLES.ADMIN, ROLES.ANALYST, ROLES.VIEWER]

router.get("/", authMiddleware, requireRoles(...ALL_ROLES), getAllTransactions)
router.get("/:id", authMiddleware, requireRoles(...ALL_ROLES), getTransactionById)
router.post(
  "/",
  authMiddleware,
  requireRoles(ROLES.ADMIN),
  validate(createTransactionSchema),
  createTransaction
)
router.patch(
  "/:id",
  authMiddleware,
  requireRoles(ROLES.ADMIN),
  validate(updateTransactionSchema),
  updateTransaction
)
router.delete(
  "/:id",
  authMiddleware,
  requireRoles(ROLES.ADMIN),
  deleteTransaction
)

export default router
