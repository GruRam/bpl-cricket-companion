/**
 * server/handlers/series.ts
 * Handles every /api/series/* sub-path. Called by api/[...path].ts.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../storage";
import { insertSeriesSchema } from "../../shared/schema";

export async function seriesHandler(
  req: VercelRequest,
  res: VercelResponse,
  segments: string[]
) {
  const method = req.method ?? "GET";

  // GET /api/series
  if (segments.length === 0 && method === "GET") {
    const series = await storage.getSeries();
    return res.json(series);
  }

  // POST /api/series
  if (segments.length === 0 && method === "POST") {
    const seriesData = insertSeriesSchema.parse(req.body);
    const series = await storage.createSeries(seriesData);
    return res.json(series);
  }

  // GET /api/series/active
  if (segments.length === 1 && segments[0] === "active" && method === "GET") {
    const activeSeries = await storage.getActiveSeries();
    return res.json(activeSeries);
  }

  // The rest are /api/series/:id/<sub>
  if (segments.length === 2) {
    const seriesId = parseInt(segments[0], 10);
    const sub = segments[1];

    if (sub === "progress" && method === "GET") {
      const progress = await storage.getSeriesProgress(seriesId);
      return res.json(progress);
    }

    if (sub === "teams" && method === "GET") {
      const teams = await storage.getTeamsBySeries(seriesId);
      return res.json(teams);
    }

    if (sub === "matches" && method === "GET") {
      const matches = await storage.getMatchesBySeries(seriesId);
      return res.json(matches);
    }

    if (sub === "recent-matches" && method === "GET") {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 5;
      const matches = await storage.getRecentMatches(seriesId, limit);
      return res.json(matches);
    }

    if (sub === "stats" && method === "GET") {
      const stats = await storage.getAllPlayerStats(seriesId);
      return res.json(stats);
    }
  }

  return res.status(404).json({ error: "Not found" });
}
