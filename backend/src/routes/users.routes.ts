import { Router } from "express";
import { verifyToken } from "../middlewares/verifyToken";
import { updateMe } from "../controllers/users.controller";

const router = Router();

router.patch("/me", verifyToken, updateMe);

export default router;
