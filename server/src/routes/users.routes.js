import { Router } from "express"
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  updateStatus
} from "../controllers/users.controller.js"
import { authMiddleware } from "../middleware/auth.js"
import { requireRoles } from "../middleware/rbac.js"
import { validate } from "../middleware/validate.js"
import {
  createUserSchema,
  updateUserSchema,
  updateStatusSchema
} from "../validators/user.validator.js"
import { ROLES } from "../utils/constants.js"

const router = Router()

router.get("/", authMiddleware, requireRoles(ROLES.ADMIN), getAllUsers)
router.get("/:id", authMiddleware, requireRoles(ROLES.ADMIN), getUserById)
router.post("/", authMiddleware, requireRoles(ROLES.ADMIN), validate(createUserSchema), createUser)
router.put("/:id", authMiddleware, requireRoles(ROLES.ADMIN), validate(updateUserSchema), updateUser)
router.patch("/:id/status", authMiddleware, requireRoles(ROLES.ADMIN), validate(updateStatusSchema), updateStatus)

export default router
