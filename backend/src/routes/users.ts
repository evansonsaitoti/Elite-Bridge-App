import { Router } from "express";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// Get user profile
router.get("/:id", authMiddleware, async (req, res) => {
  res.json({ message: "Get user profile - Coming soon" });
});

// Update user profile
router.put("/:id", authMiddleware, async (req, res) => {
  res.json({ message: "Update user profile - Coming soon" });
});

export default router;
