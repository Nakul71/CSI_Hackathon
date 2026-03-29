import { Router, Request, Response } from "express";
import { getStore } from "../data/store";
import { generateId } from "../utils/helpers";
import { ActivityType } from "../types";
import { io } from "../index";

const router = Router();

/** GET /api/activities — List with optional filters and pagination */
router.get("/", (req: Request, res: Response) => {
  const {
    type = "all",
    from,
    to,
    page = "1",
    limit = "20",
    userId = "default",
  } = req.query as Record<string, string>;

  const store = getStore(userId);
  let filtered = [...store.activities];

  // Filter by type
  if (type && type !== "all") {
    filtered = filtered.filter((a) => a.type === type);
  }

  // Filter by date range
  if (from) {
    const fromDate = new Date(from);
    filtered = filtered.filter((a) => new Date(a.timestamp) >= fromDate);
  }
  if (to) {
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    filtered = filtered.filter((a) => new Date(a.timestamp) <= toDate);
  }

  // Sort by timestamp descending (newest first)
  filtered.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Pagination
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const total = filtered.length;
  const totalPages = Math.ceil(total / limitNum);
  const start = (pageNum - 1) * limitNum;
  const paginated = filtered.slice(start, start + limitNum);

  res.json({
    data: paginated,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
    },
  });
});

/** POST /api/activities — Log a new activity */
router.post("/", (req: Request, res: Response) => {
  const { type, description, size, costINR, carbonKg, userId = "default" } = req.body;

  if (!type || !description || !size) {
    res.status(400).json({ error: "type, description, and size are required" });
    return;
  }

  const validTypes: ActivityType[] = ["email", "ai", "storage", "search"];
  if (!validTypes.includes(type)) {
    res
      .status(400)
      .json({ error: "type must be one of: email, ai, storage, search" });
    return;
  }

  const activity = {
    id: generateId(),
    type: type as ActivityType,
    description,
    size,
    costINR: costINR ?? 0,
    carbonKg: carbonKg ?? 0,
    timestamp: new Date().toISOString(),
  };

  const store = getStore(userId);

  // Add to beginning (newest first)
  store.activities.unshift(activity);

  // Keep activities bounded
  if (store.activities.length > 500) {
    store.activities.length = 500;
  }

  // ── Update KPIs ──────────────────────────────────
  store.kpi.totalCostSaved += activity.costINR * 0.3;
  store.kpi.totalCO2Saved += activity.carbonKg * 0.3;
  if (activity.type === "email") store.kpi.emailsOptimized += 1;
  if (activity.type === "ai") store.kpi.aiUsageReduced += 0.5;
  if (activity.type === "search") store.kpi.searchesOptimized += 1;

  // ── Update Time Series (map to current day of week) ──
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = days[new Date().getDay()];
  const dayEntry = store.timeSeries.find((t) => t.date === today);
  if (dayEntry) {
    dayEntry.cost += activity.costINR;
    dayEntry.carbon += activity.carbonKg;
  }

  // ── Update Distribution (pie chart data) ──────────
  const typeToName: Record<string, string> = {
    email: "Email",
    ai: "AI Usage",
    storage: "Storage",
    search: "Search",
  };
  const distEntry = store.distribution.find(
    (d) => d.name === typeToName[activity.type]
  );
  if (distEntry) {
    distEntry.value += activity.carbonKg;
  }

  // ── Update Sustainability Score ────────────────────
  // Score decreases as more high-impact activities are logged
  // Base score starts at 100, decreases by activity volume per category
  const emailCount = store.activities.filter((a) => a.type === "email").length;
  const aiCount = store.activities.filter((a) => a.type === "ai").length;
  const storageCount = store.activities.filter((a) => a.type === "storage").length;
  const searchCount = store.activities.filter((a) => a.type === "search").length;

  // Each category contributes to the breakdown (0-100 efficiency, lower = more usage)
  store.breakdown.email = Math.max(0, Math.round(100 - emailCount * 3));
  store.breakdown.ai = Math.max(0, Math.round(100 - aiCount * 5));
  store.breakdown.storage = Math.max(0, Math.round(100 - storageCount * 4));
  store.breakdown.search = Math.max(0, Math.round(100 - searchCount * 2));

  // Overall score is weighted average of all breakdowns
  store.sustainabilityScore = Math.max(
    0,
    Math.round(
      (store.breakdown.email * 0.25 +
        store.breakdown.ai * 0.35 +
        store.breakdown.storage * 0.25 +
        store.breakdown.search * 0.15)
    )
  );

  // ── Emit WebSocket events for real-time Live Tracker ──
  try {
    io.emit("new-activity", activity);
    io.emit("kpi-update", store.kpi);
  } catch (e) {
    // Socket may not be ready yet on startup
  }

  res.status(201).json(activity);
});

/** GET /api/activities/:id */
router.get("/:id", (req: Request, res: Response) => {
  const { userId = "default" } = req.query as Record<string, string>;
  const store = getStore(userId);
  const activity = store.activities.find((a) => a.id === req.params.id);
  if (!activity) {
    res.status(404).json({ error: "Activity not found" });
    return;
  }
  res.json(activity);
});

export default router;
