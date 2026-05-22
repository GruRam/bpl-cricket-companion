/**
 * server/handlers/players.ts
 * Handles every /api/players/* sub-path. Called by api/[...path].ts.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../storage";
import { insertPlayerSchema } from "../../shared/schema";

export async function playersHandler(
  req: VercelRequest,
  res: VercelResponse,
  segments: string[]
) {
  const method = req.method ?? "GET";

  // GET /api/players
  if (segments.length === 0 && method === "GET") {
    const players = await storage.getPlayers();
    return res.json(players);
  }

  // POST /api/players
  if (segments.length === 0 && method === "POST") {
    const playerData = insertPlayerSchema.parse(req.body);
    const player = await storage.createPlayer(playerData);
    return res.json(player);
  }

  // PUT /api/players/:id
  if (segments.length === 1 && method === "PUT") {
    const id = parseInt(segments[0], 10);
    const updates = insertPlayerSchema.partial().parse(req.body);
    const player = await storage.updatePlayer(id, updates);
    return res.json(player);
  }

  // GET /api/players/:id/stats?seriesId=
  if (segments.length === 2 && segments[1] === "stats" && method === "GET") {
    const playerId = parseInt(segments[0], 10);
    const seriesId = req.query.seriesId ? parseInt(req.query.seriesId as string, 10) : undefined;
    const stats = await storage.getPlayerStats(playerId, seriesId);
    return res.json(stats);
  }

  // PUT /api/players/:id/stats
  if (segments.length === 2 && segments[1] === "stats" && method === "PUT") {
    const playerId = parseInt(segments[0], 10);
    const { seriesId, ...updates } = req.body ?? {};
    await storage.updatePlayerStats(playerId, seriesId, updates);
    return res.json({ success: true });
  }

  return res.status(404).json({ error: "Not found" });
}
