/**
 * server/handlers/stats.ts
 * Handles every /api/stats/* sub-path. Called by api/[...path].ts.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../storage";

export async function statsHandler(
  req: VercelRequest,
  res: VercelResponse,
  segments: string[]
) {
  const method = req.method ?? "GET";

  // GET /api/stats/all
  if (segments.length === 1 && segments[0] === "all" && method === "GET") {
    const stats = await storage.getAllPlayerStats();
    return res.json(stats);
  }

  // POST /api/stats/update-from-ball
  if (segments.length === 1 && segments[0] === "update-from-ball" && method === "POST") {
    await storage.updatePlayerStatsFromBall(req.body);
    return res.json({ success: true });
  }

  return res.status(404).json({ error: "Not found" });
}
