/**
 * server/handlers/teams.ts
 * Handles every /api/teams/* sub-path. Called by api/[...path].ts.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { storage } from "../storage";
import { insertTeamSchema } from "../../shared/schema";

export async function teamsHandler(
  req: VercelRequest,
  res: VercelResponse,
  segments: string[]
) {
  const method = req.method ?? "GET";

  // POST /api/teams
  if (segments.length === 0 && method === "POST") {
    const teamData = insertTeamSchema.parse(req.body);
    const team = await storage.createTeam(teamData);
    return res.json(team);
  }

  // PUT /api/teams/:id
  if (segments.length === 1 && method === "PUT") {
    const id = parseInt(segments[0], 10);
    const updates = insertTeamSchema.partial().parse(req.body);
    const team = await storage.updateTeam(id, updates);
    return res.json(team);
  }

  // GET /api/teams/:id/players
  if (segments.length === 2 && segments[1] === "players" && method === "GET") {
    const teamId = parseInt(segments[0], 10);
    const players = await storage.getTeamPlayers(teamId);
    return res.json(players);
  }

  // POST /api/teams/:id/players
  if (segments.length === 2 && segments[1] === "players" && method === "POST") {
    const teamId = parseInt(segments[0], 10);
    const { playerId, seriesId } = z
      .object({ playerId: z.number(), seriesId: z.number() })
      .parse(req.body);
    await storage.addPlayerToTeam(teamId, playerId, seriesId);
    return res.json({ success: true });
  }

  // DELETE /api/teams/:teamId/players/:playerId
  if (segments.length === 3 && segments[1] === "players" && method === "DELETE") {
    const teamId = parseInt(segments[0], 10);
    const playerId = parseInt(segments[2], 10);
    await storage.removePlayerFromTeam(teamId, playerId);
    return res.json({ success: true });
  }

  return res.status(404).json({ error: "Not found" });
}
