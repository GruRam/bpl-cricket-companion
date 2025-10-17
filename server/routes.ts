import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPlayerSchema, insertSeriesSchema, insertTeamSchema, insertMatchSchema, insertBallSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Players
  app.get("/api/players", async (req, res) => {
    try {
      const players = await storage.getPlayers();
      res.json(players);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch players" });
    }
  });

  app.post("/api/players", async (req, res) => {
    try {
      const playerData = insertPlayerSchema.parse(req.body);
      const player = await storage.createPlayer(playerData);
      res.json(player);
    } catch (error) {
      res.status(400).json({ error: "Invalid player data" });
    }
  });

  app.put("/api/players/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertPlayerSchema.partial().parse(req.body);
      const player = await storage.updatePlayer(id, updates);
      res.json(player);
    } catch (error) {
      res.status(400).json({ error: "Failed to update player" });
    }
  });

  // Series
  app.get("/api/series", async (req, res) => {
    try {
      const series = await storage.getSeries();
      res.json(series);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch series" });
    }
  });

  app.get("/api/series/active", async (req, res) => {
    try {
      const activeSeries = await storage.getActiveSeries();
      res.json(activeSeries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch active series" });
    }
  });

  app.post("/api/series", async (req, res) => {
    try {
      const seriesData = insertSeriesSchema.parse(req.body);
      const series = await storage.createSeries(seriesData);
      res.json(series);
    } catch (error) {
      res.status(400).json({ error: "Invalid series data" });
    }
  });

  app.get("/api/series/:id/progress", async (req, res) => {
    try {
      const seriesId = parseInt(req.params.id);
      const progress = await storage.getSeriesProgress(seriesId);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch series progress" });
    }
  });

  // Teams
  app.get("/api/series/:id/teams", async (req, res) => {
    try {
      const seriesId = parseInt(req.params.id);
      const teams = await storage.getTeamsBySeries(seriesId);
      res.json(teams);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  });

  app.post("/api/teams", async (req, res) => {
    try {
      const teamData = insertTeamSchema.parse(req.body);
      const team = await storage.createTeam(teamData);
      res.json(team);
    } catch (error) {
      res.status(400).json({ error: "Invalid team data" });
    }
  });

  app.put("/api/teams/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertTeamSchema.partial().parse(req.body);
      const team = await storage.updateTeam(id, updates);
      res.json(team);
    } catch (error) {
      res.status(400).json({ error: "Failed to update team" });
    }
  });

  app.get("/api/teams/:id/players", async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const players = await storage.getTeamPlayers(teamId);
      res.json(players);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch team players" });
    }
  });

  app.post("/api/teams/:id/players", async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const { playerId, seriesId } = z.object({
        playerId: z.number(),
        seriesId: z.number(),
      }).parse(req.body);
      
      await storage.addPlayerToTeam(teamId, playerId, seriesId);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to add player to team" });
    }
  });

  app.delete("/api/teams/:teamId/players/:playerId", async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const playerId = parseInt(req.params.playerId);
      await storage.removePlayerFromTeam(teamId, playerId);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to remove player from team" });
    }
  });

  // Matches
  app.get("/api/series/:id/matches", async (req, res) => {
    try {
      const seriesId = parseInt(req.params.id);
      const matches = await storage.getMatchesBySeries(seriesId);
      res.json(matches);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch matches" });
    }
  });

  app.post("/api/matches", async (req, res) => {
    try {
      const matchData = insertMatchSchema.parse(req.body);
      const match = await storage.createMatch(matchData);
      res.json(match);
    } catch (error) {
      res.status(400).json({ error: "Invalid match data" });
    }
  });

  app.put("/api/matches/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertMatchSchema.partial().parse(req.body);
      const match = await storage.updateMatch(id, updates);
      res.json(match);
    } catch (error) {
      res.status(400).json({ error: "Failed to update match" });
    }
  });
  
  app.patch("/api/matches/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the current match state before updating
      const currentMatchData = await storage.getMatch(id);
      
      const updates = insertMatchSchema.partial().parse(req.body);
      const match = await storage.updateMatch(id, updates);
      
      // If match is becoming completed (wasn't completed before), update team and player stats
      if (updates.isCompleted && !currentMatchData?.isCompleted) {
        // Increment team wins if there's a winner
        if (updates.winningTeamId) {
          const winningTeamId = updates.winningTeamId;
          const teams = await storage.getTeamsBySeries(match.seriesId);
          const team = teams.find(t => t.id === winningTeamId);
          
          if (team) {
            await storage.updateTeam(winningTeamId, { wins: (team.wins || 0) + 1 });
          }
        }
        
        // Update player stats for all match participants
        const matchPlayers = await storage.getMatchPlayers(id);
        for (const mp of matchPlayers) {
          const playerStats = await storage.getPlayerStats(mp.playerId, match.seriesId);
          const currentStats = playerStats.length > 0 ? playerStats[0] : null;
          
          if (currentStats) {
            // Increment matches played
            const newMatchesPlayed = (currentStats.matchesPlayed || 0) + 1;
            
            // Increment total wins if player's team won
            const newTotalWins = mp.teamId === updates.winningTeamId 
              ? (currentStats.totalWins || 0) + 1 
              : currentStats.totalWins;
            
            await storage.updatePlayerStats(mp.playerId, match.seriesId, {
              matchesPlayed: newMatchesPlayed,
              totalWins: newTotalWins,
            });
          } else {
            // Create stats if they don't exist
            await storage.updatePlayerStats(mp.playerId, match.seriesId, {
              matchesPlayed: 1,
              totalWins: mp.teamId === updates.winningTeamId ? 1 : 0,
            });
          }
        }
      }
      
      res.json(match);
    } catch (error) {
      res.status(400).json({ error: "Failed to update match" });
    }
  });

  app.get("/api/matches/:id/players", async (req, res) => {
    try {
      const matchId = parseInt(req.params.id);
      const players = await storage.getMatchPlayers(matchId);
      res.json(players);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch match players" });
    }
  });

  app.post("/api/matches/:id/players", async (req, res) => {
    try {
      const matchId = parseInt(req.params.id);
      const { playerId, teamId } = z.object({
        playerId: z.number(),
        teamId: z.number(),
      }).parse(req.body);
      
      await storage.addPlayerToMatch(matchId, playerId, teamId);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to add player to match" });
    }
  });

  // Innings
  app.get("/api/matches/:id/innings", async (req, res) => {
    try {
      const matchId = parseInt(req.params.id);
      const innings = await storage.getInningsByMatch(matchId);
      res.json(innings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch innings" });
    }
  });

  app.post("/api/innings", async (req, res) => {
    try {
      const inningsData = req.body;
      const innings = await storage.createInnings(inningsData);
      res.json(innings);
    } catch (error) {
      res.status(400).json({ error: "Invalid innings data" });
    }
  });

  // Overs
  app.get("/api/innings/:id/overs", async (req, res) => {
    try {
      const inningsId = parseInt(req.params.id);
      const overs = await storage.getOversByInnings(inningsId);
      res.json(overs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch overs" });
    }
  });

  app.post("/api/overs", async (req, res) => {
    try {
      const overData = req.body;
      const over = await storage.createOver(overData);
      res.json(over);
    } catch (error) {
      res.status(400).json({ error: "Invalid over data" });
    }
  });

  // Balls
  app.get("/api/overs/:id/balls", async (req, res) => {
    try {
      const overId = parseInt(req.params.id);
      const balls = await storage.getBallsByOver(overId);
      res.json(balls);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch balls" });
    }
  });

  app.post("/api/balls", async (req, res) => {
    try {
      const ballData = insertBallSchema.parse(req.body);
      const ball = await storage.createBall(ballData);
      
      // Update player stats in real-time if we have the required data
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
      
      res.json(ball);
    } catch (error) {
      res.status(400).json({ error: "Invalid ball data" });
    }
  });

  // Stats
  app.get("/api/players/:id/stats", async (req, res) => {
    try {
      const playerId = parseInt(req.params.id);
      const seriesId = req.query.seriesId ? parseInt(req.query.seriesId as string) : undefined;
      const stats = await storage.getPlayerStats(playerId, seriesId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch player stats" });
    }
  });

  app.put("/api/players/:id/stats", async (req, res) => {
    try {
      const playerId = parseInt(req.params.id);
      const { seriesId, ...updates } = req.body;
      await storage.updatePlayerStats(playerId, seriesId, updates);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to update player stats" });
    }
  });

  // Get all player stats for a series
  app.get("/api/series/:id/stats", async (req, res) => {
    try {
      const seriesId = parseInt(req.params.id);
      const stats = await storage.getAllPlayerStats(seriesId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch series stats" });
    }
  });

  // Update stats from ball data (manual endpoint for testing)
  app.post("/api/stats/update-from-ball", async (req, res) => {
    try {
      await storage.updatePlayerStatsFromBall(req.body);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to update stats from ball data" });
    }
  });

  // Save ball with auto-creation of innings/overs and stats update
  app.post("/api/balls/save-with-context", async (req, res) => {
    try {
      const ball = await storage.saveBallWithContext(req.body);
      res.json(ball);
    } catch (error) {
      console.error("Error saving ball:", error);
      res.status(400).json({ error: "Failed to save ball data" });
    }
  });

  app.get("/api/series/:id/recent-matches", async (req, res) => {
    try {
      const seriesId = parseInt(req.params.id);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const matches = await storage.getRecentMatches(seriesId, limit);
      res.json(matches);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recent matches" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
