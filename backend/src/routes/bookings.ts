import { Router } from "express";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.get("/", authMiddleware, async (req, res) => {
  res.json({ message: "Coming soon" });
});

export default router;
