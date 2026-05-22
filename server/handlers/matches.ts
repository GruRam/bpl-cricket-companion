/**
 * server/handlers/matches.ts
 * Handles every /api/matches/* sub-path. Called by api/[...path].ts.
 * Includes the match-completion side-effects (team wins, player stats, series-win tally).
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { storage } from "../storage";
import { insertMatchSchema } from "../../shared/schema";

export async function matchesHandler(
  req: VercelRequest,
  res: VercelResponse,
  segments: string[]
) {
  const method = req.method ?? "GET";

  // POST /api/matches
  if (segments.length === 0 && method === "POST") {
    const matchData = insertMatchSchema.parse(req.body);
    const match = await storage.createMatch(matchData);
    return res.json(match);
  }

  // GET /api/matches/all
  if (segments.length === 1 && segments[0] === "all" && method === "GET") {
    const matches = await storage.getAllMatches();
    return res.json(matches);
  }

  // PUT /api/matches/:id (plain update, no side effects)
  if (segments.length === 1 && method === "PUT") {
    const id = parseInt(segments[0], 10);
    const updates = insertMatchSchema.partial().parse(req.body);
    const match = await storage.updateMatch(id, updates);
    return res.json(match);
  }

  // PATCH /api/matches/:id (update + completion side-effects)
  if (segments.length === 1 && method === "PATCH") {
    const id = parseInt(segments[0], 10);
    const currentMatchData = await storage.getMatch(id);
    const updates = insertMatchSchema.partial().parse(req.body);
    const match = await storage.updateMatch(id, updates);

    if (updates.isCompleted && !currentMatchData?.isCompleted && match.seriesId) {
      const seriesId = match.seriesId;

      if (updates.winningTeamId) {
        const winningTeamId = updates.winningTeamId;
        const teams = await storage.getTeamsBySeries(seriesId);
        const team = teams.find((t) => t.id === winningTeamId);
        if (team) {
          await storage.updateTeam(winningTeamId, { wins: (team.wins || 0) + 1 });
        }
      }

      const matchPlayers = await storage.getMatchPlayers(id);
      for (const mp of matchPlayers) {
        // Drizzle types these FKs as nullable; in practice a row can't exist without them.
        if (mp.playerId == null) continue;
        const playerId = mp.playerId;
        const playerStats = await storage.getPlayerStats(playerId, seriesId);
        const currentStats = playerStats.length > 0 ? playerStats[0] : null;

        if (currentStats) {
          const newMatchesPlayed = (currentStats.matchesPlayed || 0) + 1;
          const newTotalWins =
            mp.teamId === updates.winningTeamId
              ? (currentStats.totalWins || 0) + 1
              : currentStats.totalWins;
          await storage.updatePlayerStats(playerId, seriesId, {
            matchesPlayed: newMatchesPlayed,
            totalWins: newTotalWins,
          });
        } else {
          await storage.updatePlayerStats(playerId, seriesId, {
            matchesPlayed: 1,
            totalWins: mp.teamId === updates.winningTeamId ? 1 : 0,
            seriesPlayed: 1,
          });
        }
      }

      const seriesData = await storage.getSeriesById(seriesId);
      if (seriesData) {
        const targetWins = seriesData.targetWins || 13;
        const updatedTeams = await storage.getTeamsBySeries(seriesId);
        const winningTeam = updatedTeams.find((t) => (t.wins || 0) >= targetWins);

        if (winningTeam) {
          const allSeriesPlayers = await storage.getTeamPlayersForSeries(seriesId);
          const seriesPlayerIds = Array.from(
            new Set(
              allSeriesPlayers
                .map((tp) => tp.playerId)
                .filter((id): id is number => id != null)
            )
          );

          for (const playerId of seriesPlayerIds) {
            const playerStats = await storage.getPlayerStats(playerId, seriesId);
            const currentStats = playerStats.length > 0 ? playerStats[0] : null;
            const isOnWinningTeam = allSeriesPlayers.some(
              (tp) => tp.playerId === playerId && tp.teamId === winningTeam.id
            );
            const newSeriesWins = isOnWinningTeam
              ? (currentStats?.seriesWins || 0) + 1
              : currentStats?.seriesWins || 0;
            await storage.updatePlayerStats(playerId, seriesId, { seriesWins: newSeriesWins });
          }

          for (const team of updatedTeams) {
            if (team.captainId && (team.wins || 0) >= targetWins) {
              const captainStats = await storage.getPlayerStats(team.captainId, seriesId);
              const currentStats = captainStats.length > 0 ? captainStats[0] : null;
              await storage.updatePlayerStats(team.captainId, seriesId, {
                winsAsCaptain: (currentStats?.winsAsCaptain || 0) + 1,
                captainSeriesPlayed: (currentStats?.captainSeriesPlayed || 0) + 1,
              });
            }
          }
        }
      }
    }

    return res.json(match);
  }

  // DELETE /api/matches/:id
  if (segments.length === 1 && method === "DELETE") {
    const id = parseInt(segments[0], 10);
    await storage.deleteMatch(id);
    return res.json({ success: true });
  }

  // GET /api/matches/:id/players
  if (segments.length === 2 && segments[1] === "players" && method === "GET") {
    const matchId = parseInt(segments[0], 10);
    const players = await storage.getMatchPlayers(matchId);
    return res.json(players);
  }

  // POST /api/matches/:id/players
  if (segments.length === 2 && segments[1] === "players" && method === "POST") {
    const matchId = parseInt(segments[0], 10);
    const { playerId, teamId } = z
      .object({ playerId: z.number(), teamId: z.number() })
      .parse(req.body);
    await storage.addPlayerToMatch(matchId, playerId, teamId);
    return res.json({ success: true });
  }

  // GET /api/matches/:id/innings
  if (segments.length === 2 && segments[1] === "innings" && method === "GET") {
    const matchId = parseInt(segments[0], 10);
    const innings = await storage.getInningsByMatch(matchId);
    return res.json(innings);
  }

  // GET /api/matches/:matchId/scorecard
  if (segments.length === 2 && segments[1] === "scorecard" && method === "GET") {
    const matchId = parseInt(segments[0], 10);
    const scorecard = await storage.getMatchScorecard(matchId);
    return res.json(scorecard);
  }

  return res.status(404).json({ error: "Not found" });
}
