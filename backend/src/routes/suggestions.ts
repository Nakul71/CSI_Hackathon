import { Router, Request, Response } from "express";
import { getStore, recalculateUserMetrics } from "../data/store";

const router = Router();

/** GET /api/suggestions — List all suggestions, optional impact filter */
router.get("/", (req: Request, res: Response) => {
  const { impact, userId = "default" } = req.query as Record<string, string>;
  const store = getStore(userId);

  let result = [...store.suggestions];
  if (impact && impact !== "all") {
    result = result.filter((s) => s.impact === impact);
  }

  res.json(result);
});

/** PATCH /api/suggestions/:id/apply — Mark a suggestion as applied */
router.patch("/:id/apply", (req: Request, res: Response) => {
  const { userId = "default" } = req.body;
  const store = getStore(userId);
  const suggestion = store.suggestions.find((s) => s.id === req.params.id);

  if (!suggestion) {
    res.status(404).json({ error: "Suggestion not found" });
    return;
  }

  if (suggestion.applied) {
    res.status(409).json({ error: "Suggestion already applied" });
    return;
  }

  suggestion.applied = true;

  // Update KPIs with savings
  store.kpi.totalCostSaved += suggestion.savingsINR;
  store.kpi.totalCO2Saved += suggestion.savingsCO2;
  if (suggestion.category === "email") store.kpi.emailsOptimized += 1;
  if (suggestion.category === "ai") store.kpi.aiUsageReduced += 20;
  if (suggestion.category === "search") store.kpi.searchesOptimized += 1;

  // Recalculate metrics
  recalculateUserMetrics(store);

  // Emit live WebSocket update
  const io = req.app.get("io");
  if (io) {
    io.emit("kpi-update", store.kpi);
  }

  res.json({
    suggestion,
    updatedKPI: store.kpi,
  });
});

export default router;
