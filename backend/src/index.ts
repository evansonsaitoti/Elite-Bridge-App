import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { config } from "./config/env.js";
import { checkDatabaseConnection } from "./db";
import { errorHandler } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/requestLogger";

// Import routes
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import caregiverRoutes from "./routes/caregivers";
import employerRoutes from "./routes/employers";
import bookingRoutes from "./routes/bookings";
import messageRoutes from "./routes/messages";
import paymentRoutes from "./routes/payments";
import payrollRoutes from "./routes/payroll";
import adminRoutes from "./routes/admin";

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: config.CORS_ORIGIN,
    credentials: true,
  },
});

// Middleware
app.use(helmet());
app.use(cors({ origin: config.CORS_ORIGIN }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(morgan("combined"));
app.use(requestLogger);

// Health check endpoint
app.get("/health", async (req, res) => {
  const dbConnected = await checkDatabaseConnection();

  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? "ok" : "database_unavailable",
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/caregivers", caregiverRoutes);
app.use("/api/employers", employerRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/admin", adminRoutes);

// Socket.IO for real-time features
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("join", (userId: number) => {
    socket.join(`user_${userId}`);
  });

  socket.on("send_message", (data) => {
    io.to(`user_${data.recipientId}`).emit("receive_message", data);
  });

  socket.on("typing", (data) => {
    io.to(`user_${data.recipientId}`).emit("user_typing", {
      senderId: data.senderId,
      isTyping: data.isTyping,
    });
  });

  socket.on("send_notification", (data) => {
    io.to(`user_${data.userId}`).emit("receive_notification", data);
  });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Start server outside Vercel serverless runtime
async function startServer() {
  try {
    const dbConnected = await checkDatabaseConnection();
    if (!dbConnected) {
      throw new Error("Failed to connect to database");
    }

    httpServer.listen(config.PORT, () => {
      console.log(`Elite Bridge Backend Server running on port ${config.PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

if (!process.env.VERCEL) {
  startServer();
}

process.on("SIGTERM", () => {
  httpServer.close(() => {
    process.exit(0);
  });
});

export { app, httpServer, io };
