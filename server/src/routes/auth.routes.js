import { Router } from "express"
import { register, login, getMe } from "../controllers/auth.controller.js"
import { authMiddleware } from "../middleware/auth.js"
import { validate } from "../middleware/validate.js"
import { registerSchema, loginSchema } from "../validators/auth.validator.js"

const router = Router()

router.post("/register", validate(registerSchema), register)
router.post("/login", validate(loginSchema), login)
router.get("/me", authMiddleware, getMe)

export default router
