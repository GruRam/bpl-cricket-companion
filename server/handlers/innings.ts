/**
 * server/handlers/innings.ts
 * Handles every /api/innings/* sub-path. Called by api/[...path].ts.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../storage";

export async function inningsHandler(
  req: VercelRequest,
  res: VercelResponse,
  segments: string[]
) {
  const method = req.method ?? "GET";

  // POST /api/innings
  if (segments.length === 0 && method === "POST") {
    const innings = await storage.createInnings(req.body);
    return res.json(innings);
  }

  // GET /api/innings/:id/overs
  if (segments.length === 2 && segments[1] === "overs" && method === "GET") {
    const inningsId = parseInt(segments[0], 10);
    const overs = await storage.getOversByInnings(inningsId);
    return res.json(overs);
  }

  return res.status(404).json({ error: "Not found" });
}
