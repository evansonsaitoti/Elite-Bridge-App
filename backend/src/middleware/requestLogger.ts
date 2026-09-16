import { Request, Response, NextFunction } from "express";
import winston from "winston";

const logger = winston.createLogger({
  level: process.env.NODE_ENV === "development" ? "debug" : "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "elite-bridge-api" },
  // Vercel's deployment filesystem is read-only. Console output is captured by
  // Runtime Logs and avoids crashing the function while opening local files.
  transports: [new winston.transports.Console()],
});

if (process.env.NODE_ENV === "development") {
  logger.format = winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  );
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });
  });

  next();
}

export default logger;
