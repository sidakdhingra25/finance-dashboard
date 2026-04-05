import { Router } from "express"
import { getSummary, getRecent, getTrends } from "../controllers/dashboard.controller.js"
import { authMiddleware } from "../middleware/auth.js"
import { requireRoles } from "../middleware/rbac.js"
import { ROLES } from "../utils/constants.js"

const router = Router()

router.get(
  "/summary",
  authMiddleware,
  requireRoles(ROLES.ADMIN, ROLES.ANALYST),
  getSummary
)

router.get(
  "/trends",
  authMiddleware,
  requireRoles(ROLES.ADMIN, ROLES.ANALYST),
  getTrends
)

router.get(
  "/recent",
  authMiddleware,
  requireRoles(ROLES.ADMIN, ROLES.ANALYST, ROLES.VIEWER),
  getRecent
)

export default router
