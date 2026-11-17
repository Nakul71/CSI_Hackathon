import { Router, Request, Response } from "express";
import {
  shortenPrompt,
  estimateTokens,
  CompressionIntensity,
} from "../services/promptCompressor";
import { getStore, recalculateUserMetrics } from "../data/store";
import { generateId } from "../utils/helpers";

const router: Router = Router();

/**
 * POST /api/prompt/shorten
 * Shortens an AI prompt using Neural or Local ML/NLP compression,
 * calculates token, carbon, and cost savings, and updates user metrics in real-time.
 */
router.post("/shorten", async (req: Request, res: Response) => {
  try {
    const {
      prompt,
      intensity = "balanced",
      userId = "default",
      logActivity = true,
    } = req.body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      res.status(400).json({ error: "prompt string is required" });
      return;
    }

    const validIntensities: CompressionIntensity[] = [
      "conservative",
      "balanced",
      "aggressive",
    ];
    const selectedIntensity: CompressionIntensity = validIntensities.includes(
      intensity
    )
      ? intensity
      : "balanced";

    // Run Prompt Compressor
    const result = await shortenPrompt(prompt, selectedIntensity);

    const store = getStore(userId);

    // If tokens were saved, update store metrics
    if (result.tokensSaved > 0) {
      store.kpi.aiUsageReduced += result.tokensSaved;
      store.kpi.totalCostSaved += result.costSavedINR;
      store.kpi.totalCO2Saved += result.carbonSavedKg;

      let activity = null;
      if (logActivity) {
        activity = {
          id: generateId(),
          type: "ai" as const,
          description: `Prompt compressed: saved ${result.tokensSaved} tokens (${result.reductionPercentage}%)`,
          size: `${result.shortenedTokens} tokens`,
          costINR: -result.costSavedINR, // negative = savings
          carbonKg: -result.carbonSavedKg,
          timestamp: new Date().toISOString(),
        };

        store.activities.unshift(activity);
        if (store.activities.length > 200) {
          store.activities.length = 200;
        }
      }

      // Recalculate dynamic metrics
      recalculateUserMetrics(store);

      // Emit live WebSocket updates if io is available
      const io = req.app.get("io");
      if (io) {
        if (activity) {
          io.emit("new-activity", activity);
        }
        io.emit("kpi-update", store.kpi);
      }
    }

    res.json(result);
  } catch (error: any) {
    console.error("[Prompt Shorten Error]", error);
    res.status(500).json({ error: error.message || "Failed to compress prompt" });
  }
});

/**
 * POST /api/prompt/analyze
 * Quick token count and optimization feasibility check
 */
router.post("/analyze", (req: Request, res: Response) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== "string") {
    res.status(400).json({ error: "prompt string is required" });
    return;
  }

  const tokenCount = estimateTokens(prompt);
  const estCostINR = parseFloat((tokenCount * 0.0003).toFixed(4));
  const estCarbonKg = parseFloat((tokenCount * 0.00002).toFixed(6));

  res.json({
    promptLength: prompt.length,
    estimatedTokens: tokenCount,
    estimatedCostINR: estCostINR,
    estimatedCarbonKg: estCarbonKg,
    needsOptimization: tokenCount > 35,
  });
});

export default router;
