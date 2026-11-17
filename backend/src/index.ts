import express from "express";
import cors from "cors";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import dotenv from "dotenv";

import dashboardRoutes from "./routes/dashboard";
import activitiesRoutes from "./routes/activities";
import suggestionsRoutes from "./routes/suggestions";
import aiSuggestionsRoutes from "./routes/ai-suggestions";
import scoreRoutes from "./routes/score";
import settingsRoutes from "./routes/settings";
import calculateRoutes from "./routes/calculate";
import promptRoutes from "./routes/prompt";

dotenv.config();

const app = express();
const server = http.createServer(app);

// ── CORS ─────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl, etc.)
      if (!origin) return callback(null, true);
      // Hackathon Fix: allow all chrome extensions and localhost ports
      if (
        /^http:\/\/localhost:\d+$/.test(origin) || 
        /^chrome-extension:\/\//.test(origin)
      ) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json());

// ── Socket.IO ────────────────────────────────────────
const io = new SocketIOServer(server, {
  cors: {
    origin:
      process.env.NODE_ENV === "development"
        ? (_origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => cb(null, true)
        : allowedOrigins,
    methods: ["GET", "POST"],
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`[WS] Client disconnected: ${socket.id}`);
  });
});

// ── REST Routes ──────────────────────────────────────
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/activities", activitiesRoutes);
app.use("/api/suggestions", suggestionsRoutes);
app.use("/api/ai-suggestions", aiSuggestionsRoutes);
app.use("/api/score", scoreRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/calculate", calculateRoutes);
app.use("/api/prompt", promptRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ── Start Server ─────────────────────────────────────
const PORT = parseInt(process.env.PORT || "5000", 10);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`
  ╔═══════════════════════════════════════════════╗
  ║   Carbon-oh-no Backend                        ║
  ║   Running on http://localhost:${PORT}             ║
  ║   WebSocket:  ws://localhost:${PORT}              ║
  ║   Environment: ${process.env.NODE_ENV || "development"}                 ║
  ╚═══════════════════════════════════════════════╝
  `);
});

export { app, server, io };
