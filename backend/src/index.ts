import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { config } from "./config/env";
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
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
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
app.use("/api/admin", adminRoutes);

// Socket.IO for real-time features
io.on("connection", (socket) => {
  console.log(`✅ User connected: ${socket.id}`);

  // Join user to their personal room
  socket.on("join", (userId: number) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined their room`);
  });

  // Messaging
  socket.on("send_message", (data) => {
    io.to(`user_${data.recipientId}`).emit("receive_message", data);
  });

  // Typing indicator
  socket.on("typing", (data) => {
    io.to(`user_${data.recipientId}`).emit("user_typing", {
      senderId: data.senderId,
      isTyping: data.isTyping,
    });
  });

  // Notifications
  socket.on("send_notification", (data) => {
    io.to(`user_${data.userId}`).emit("receive_notification", data);
  });

  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.id}`);
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

// Start server
async function startServer() {
  try {
    // Check database connection
    const dbConnected = await checkDatabaseConnection();
    if (!dbConnected) {
      throw new Error("Failed to connect to database");
    }

    httpServer.listen(config.PORT, () => {
      console.log(`
╔════════════════════════════════════════╗
║   Elite Bridge Backend Server          ║
║   Environment: ${config.NODE_ENV.padEnd(24)} ║
║   Port: ${config.PORT.toString().padEnd(30)} ║
║   Status: ✅ Running                   ║
╚════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  httpServer.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

startServer();

export { app, httpServer, io };
