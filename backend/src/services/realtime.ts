import type { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { config } from "../config/env";

export function configureRealtime(io: Server) {
  io.use((socket, next) => {
    try {
      const decoded = jwt.verify(socket.handshake.auth?.token, config.JWT_SECRET);
      if (typeof decoded === "string" || !Number.isSafeInteger(decoded.id) || decoded.id <= 0) {
        return next(new Error("Unauthorized"));
      }
      socket.data.userId = decoded.id;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });
  io.on("connection", socket => {
    socket.join(`user_${socket.data.userId}`);
    // Clients cannot select another user's room or broadcast messages/notifications.
    // All writes go through the authenticated REST endpoints and their permissions.
  });
}
