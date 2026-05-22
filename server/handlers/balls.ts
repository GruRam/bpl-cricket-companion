/**
 * server/handlers/balls.ts
 * Handles every /api/balls/* sub-path. Called by api/[...path].ts.
 * Owns the scorer's main write path: POST /api/balls/save-with-context.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../storage";
import { insertBallSchema } from "../../shared/schema";

export async function ballsHandler(
  req: VercelRequest,
  res: VercelResponse,
  segments: string[]
) {
  const method = req.method ?? "GET";

  // POST /api/balls
  if (segments.length === 0 && method === "POST") {
    const ballData = insertBallSchema.parse(req.body);
    const ball = await storage.createBall(ballData);

    if (ballData.strikerId && ballData.nonStrikerId && ballData.bowlerId && req.body.seriesId) {
      await storage.updatePlayerStatsFromBall({
        strikerId: ballData.strikerId,
        nonStrikerId: ballData.nonStrikerId,
        bowlerId: ballData.bowlerId,
        runs: ballData.runs || 0,
        isWicket: ballData.isWicket || false,
        wicketPlayerId: ballData.wicketPlayerId ?? undefined,
        fielderId: ballData.fielderId ?? undefined,
        seriesId: req.body.seriesId,
      });
    }

    return res.json(ball);
  }

  // POST /api/balls/save-with-context
  if (segments.length === 1 && segments[0] === "save-with-context" && method === "POST") {
    const ball = await storage.saveBallWithContext(req.body);
    return res.json(ball);
  }

  return res.status(404).json({ error: "Not found" });
}
