/**
 * server/handlers/overs.ts
 * Handles every /api/overs/* sub-path. Called by api/[...path].ts.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../storage";

export async function oversHandler(
  req: VercelRequest,
  res: VercelResponse,
  segments: string[]
) {
  const method = req.method ?? "GET";

  // POST /api/overs
  if (segments.length === 0 && method === "POST") {
    const over = await storage.createOver(req.body);
    return res.json(over);
  }

  // GET /api/overs/:id/balls
  if (segments.length === 2 && segments[1] === "balls" && method === "GET") {
    const overId = parseInt(segments[0], 10);
    const balls = await storage.getBallsByOver(overId);
    return res.json(balls);
  }

  return res.status(404).json({ error: "Not found" });
}
