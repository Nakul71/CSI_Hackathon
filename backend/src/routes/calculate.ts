import { Router, Request, Response } from "express";
import {
  estimateEmailCarbon,
  estimateEmailCost,
  estimateAICarbon,
  estimateAICost,
  estimateStorageCarbon,
  estimateStorageCost,
  estimateSearchCarbon,
  estimateSearchCost,
  parseSize,
} from "../utils/carbon";
import { ActivityType } from "../types";

const router = Router();

/** POST /api/calculate — Estimate cost and carbon for a given activity */
router.post("/", (req: Request, res: Response) => {
  const { type, size } = req.body as { type: ActivityType; size: string };

  if (!type || !size) {
    res.status(400).json({ error: "type and size are required" });
    return;
  }

  const parsed = parseSize(size);

  let costINR = 0;
  let carbonKg = 0;

  switch (type) {
    case "email":
      costINR = estimateEmailCost(parsed.value);
      carbonKg = estimateEmailCarbon(parsed.value);
      break;
    case "ai":
      costINR = estimateAICost(parsed.value);
      carbonKg = estimateAICarbon(parsed.value);
      break;
    case "storage":
      costINR = estimateStorageCost(parsed.value);
      carbonKg = estimateStorageCarbon(parsed.value);
      break;
    case "search":
      costINR = estimateSearchCost(parsed.value || 1);
      carbonKg = estimateSearchCarbon(parsed.value || 1);
      break;
    default:
      res
        .status(400)
        .json({ error: "type must be one of: email, ai, storage, search" });
      return;
  }

  res.json({
    type,
    size,
    parsed: { value: parsed.value, unit: parsed.unit },
    costINR: +costINR.toFixed(4),
    carbonKg: +carbonKg.toFixed(6),
  });
});

export default router;
