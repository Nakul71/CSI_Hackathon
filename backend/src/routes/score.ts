import { Router, Request, Response } from "express";
import { getStore } from "../data/store";
import { ScoreResponse } from "../types";

const router: Router = Router();

/** GET /api/score — Sustainability score + breakdown */
router.get("/", (req: Request, res: Response) => {
  const { userId = "default" } = req.query as Record<string, string>;
  const store = getStore(userId);
  const response: ScoreResponse = {
    score: store.sustainabilityScore,
    breakdown: store.breakdown,
  };
  res.json(response);
});

export default router;
