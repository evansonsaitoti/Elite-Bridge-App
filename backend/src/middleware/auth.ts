import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/env";
import { AppError } from "./errorHandler";

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: "caregiver" | "employer" | "admin";
  };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      throw new AppError(401, "No authentication token provided");
    }

    const decoded = jwt.verify(token, config.JWT_SECRET) as {
      id: number;
      email: string;
      role: "caregiver" | "employer" | "admin";
    };

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError(401, "Invalid or expired token");
    }
    throw error;
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError(401, "User not authenticated");
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError(403, "Insufficient permissions");
    }

    next();
  };
}

export function generateToken(user: { id: number; email: string; role: string }): string {
  return jwt.sign(user, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRE,
  });
}
