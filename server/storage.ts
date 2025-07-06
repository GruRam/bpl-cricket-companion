import { 
  players, teams, series, matches, balls, overs, innings, playerStats, teamPlayers, matchPlayers,
  type Player, type InsertPlayer, type Series, type InsertSeries, type Team, type InsertTeam,
  type Match, type InsertMatch, type Ball, type InsertBall, type Innings, type Over,
  type PlayerStats, type TeamPlayer, type MatchPlayer
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  // Players
  getPlayers(): Promise<Player[]>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  updatePlayer(id: number, updates: Partial<InsertPlayer>): Promise<Player>;
  
  // Series
  getSeries(): Promise<Series[]>;
  getActiveSeries(): Promise<Series | null>;
  createSeries(series: InsertSeries): Promise<Series>;
  updateSeries(id: number, updates: Partial<InsertSeries>): Promise<Series>;
  
  // Teams
  getTeamsBySeries(seriesId: number): Promise<(Team & { captain: Player })[]>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: number, updates: Partial<InsertTeam>): Promise<Team>;
  
  // Team Players
  getTeamPlayers(teamId: number): Promise<(TeamPlayer & { player: Player })[]>;
  addPlayerToTeam(teamId: number, playerId: number, seriesId: number): Promise<void>;
  removePlayerFromTeam(teamId: number, playerId: number): Promise<void>;
  
  // Matches
  getMatchesBySeries(seriesId: number): Promise<Match[]>;
  createMatch(match: InsertMatch): Promise<Match>;
  updateMatch(id: number, updates: Partial<InsertMatch>): Promise<Match>;
  
  // Match Players
  getMatchPlayers(matchId: number): Promise<(MatchPlayer & { player: Player })[]>;
  addPlayerToMatch(matchId: number, playerId: number, teamId: number): Promise<void>;
  
  // Innings
  getInningsByMatch(matchId: number): Promise<Innings[]>;
  createInnings(innings: Omit<Innings, 'id'>): Promise<Innings>;
  updateInnings(id: number, updates: Partial<Innings>): Promise<Innings>;
  
  // Overs
  getOversByInnings(inningsId: number): Promise<Over[]>;
  createOver(over: Omit<Over, 'id'>): Promise<Over>;
  updateOver(id: number, updates: Partial<Over>): Promise<Over>;
  
  // Balls
  getBallsByOver(overId: number): Promise<Ball[]>;
  createBall(ball: InsertBall): Promise<Ball>;
  
  // Stats
  getPlayerStats(playerId: number, seriesId?: number): Promise<PlayerStats[]>;
  updatePlayerStats(playerId: number, seriesId: number, updates: Partial<PlayerStats>): Promise<void>;
  
  // Dashboard
  getSeriesProgress(seriesId: number): Promise<{ team1Wins: number; team2Wins: number; team1: Team; team2: Team }>;
  getRecentMatches(seriesId: number, limit?: number): Promise<Match[]>;
}

export class DatabaseStorage implements IStorage {
  async getPlayers(): Promise<Player[]> {
    return await db.select().from(players).where(eq(players.isActive, true));
  }

  async createPlayer(player: InsertPlayer): Promise<Player> {
    const [newPlayer] = await db.insert(players).values(player).returning();
    return newPlayer;
  }

  async updatePlayer(id: number, updates: Partial<InsertPlayer>): Promise<Player> {
    const [updatedPlayer] = await db.update(players).set(updates).where(eq(players.id, id)).returning();
    return updatedPlayer;
  }

  async getSeries(): Promise<Series[]> {
    return await db.select().from(series).orderBy(desc(series.createdAt));
  }

  async getActiveSeries(): Promise<Series | null> {
    const [activeSeries] = await db.select().from(series).where(eq(series.isActive, true)).limit(1);
    return activeSeries || null;
  }

  async createSeries(seriesData: InsertSeries): Promise<Series> {
    // Deactivate other series first
    await db.update(series).set({ isActive: false }).where(eq(series.isActive, true));
    
    const [newSeries] = await db.insert(series).values({ ...seriesData, isActive: true }).returning();
    return newSeries;
  }

  async updateSeries(id: number, updates: Partial<InsertSeries>): Promise<Series> {
    const [updatedSeries] = await db.update(series).set(updates).where(eq(series.id, id)).returning();
    return updatedSeries;
  }

  async getTeamsBySeries(seriesId: number): Promise<(Team & { captain: Player })[]> {
    return await db
      .select()
      .from(teams)
      .innerJoin(players, eq(teams.captainId, players.id))
      .where(eq(teams.seriesId, seriesId))
      .then(rows => rows.map(row => ({ ...row.teams, captain: row.players })));
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const [newTeam] = await db.insert(teams).values(team).returning();
    return newTeam;
  }

  async updateTeam(id: number, updates: Partial<InsertTeam>): Promise<Team> {
    const [updatedTeam] = await db.update(teams).set(updates).where(eq(teams.id, id)).returning();
    return updatedTeam;
  }

  async getTeamPlayers(teamId: number): Promise<(TeamPlayer & { player: Player })[]> {
    return await db
      .select()
      .from(teamPlayers)
      .innerJoin(players, eq(teamPlayers.playerId, players.id))
      .where(eq(teamPlayers.teamId, teamId))
      .then(rows => rows.map(row => ({ ...row.team_players, player: row.players })));
  }

  async addPlayerToTeam(teamId: number, playerId: number, seriesId: number): Promise<void> {
    await db.insert(teamPlayers).values({ teamId, playerId, seriesId });
  }

  async removePlayerFromTeam(teamId: number, playerId: number): Promise<void> {
    await db.delete(teamPlayers).where(and(eq(teamPlayers.teamId, teamId), eq(teamPlayers.playerId, playerId)));
  }

  async getMatchesBySeries(seriesId: number): Promise<Match[]> {
    return await db.select().from(matches).where(eq(matches.seriesId, seriesId)).orderBy(desc(matches.matchDate));
  }

  async createMatch(match: InsertMatch): Promise<Match> {
    const [newMatch] = await db.insert(matches).values(match).returning();
    return newMatch;
  }

  async updateMatch(id: number, updates: Partial<InsertMatch>): Promise<Match> {
    const [updatedMatch] = await db.update(matches).set(updates).where(eq(matches.id, id)).returning();
    return updatedMatch;
  }

  async getMatchPlayers(matchId: number): Promise<(MatchPlayer & { player: Player })[]> {
    return await db
      .select()
      .from(matchPlayers)
      .innerJoin(players, eq(matchPlayers.playerId, players.id))
      .where(eq(matchPlayers.matchId, matchId))
      .then(rows => rows.map(row => ({ ...row.match_players, player: row.players })));
  }

  async addPlayerToMatch(matchId: number, playerId: number, teamId: number): Promise<void> {
    await db.insert(matchPlayers).values({ matchId, playerId, teamId });
  }

  async getInningsByMatch(matchId: number): Promise<Innings[]> {
    return await db.select().from(innings).where(eq(innings.matchId, matchId));
  }

  async createInnings(inningsData: Omit<Innings, 'id'>): Promise<Innings> {
    const [newInnings] = await db.insert(innings).values(inningsData).returning();
    return newInnings;
  }

  async updateInnings(id: number, updates: Partial<Innings>): Promise<Innings> {
    const [updatedInnings] = await db.update(innings).set(updates).where(eq(innings.id, id)).returning();
    return updatedInnings;
  }

  async getOversByInnings(inningsId: number): Promise<Over[]> {
    return await db.select().from(overs).where(eq(overs.inningsId, inningsId));
  }

  async createOver(overData: Omit<Over, 'id'>): Promise<Over> {
    const [newOver] = await db.insert(overs).values(overData).returning();
    return newOver;
  }

  async updateOver(id: number, updates: Partial<Over>): Promise<Over> {
    const [updatedOver] = await db.update(overs).set(updates).where(eq(overs.id, id)).returning();
    return updatedOver;
  }

  async getBallsByOver(overId: number): Promise<Ball[]> {
    return await db.select().from(balls).where(eq(balls.overId, overId));
  }

  async createBall(ball: InsertBall): Promise<Ball> {
    const [newBall] = await db.insert(balls).values(ball).returning();
    return newBall;
  }

  async getPlayerStats(playerId: number, seriesId?: number): Promise<PlayerStats[]> {
    if (seriesId) {
      return await db.select().from(playerStats)
        .where(and(eq(playerStats.playerId, playerId), eq(playerStats.seriesId, seriesId)));
    } else {
      return await db.select().from(playerStats).where(eq(playerStats.playerId, playerId));
    }
  }

  async updatePlayerStats(playerId: number, seriesId: number, updates: Partial<PlayerStats>): Promise<void> {
    const existingStats = await db.select().from(playerStats)
      .where(and(eq(playerStats.playerId, playerId), eq(playerStats.seriesId, seriesId)))
      .limit(1);

    if (existingStats.length > 0) {
      await db.update(playerStats).set(updates)
        .where(and(eq(playerStats.playerId, playerId), eq(playerStats.seriesId, seriesId)));
    } else {
      await db.insert(playerStats).values({ playerId, seriesId, ...updates });
    }
  }

  async getSeriesProgress(seriesId: number): Promise<{ team1Wins: number; team2Wins: number; team1: Team; team2: Team }> {
    const teamsWithCaptains = await this.getTeamsBySeries(seriesId);
    if (teamsWithCaptains.length < 2) {
      throw new Error('Series must have at least 2 teams');
    }

    // Extract team data without captain for compatibility
    const teams = teamsWithCaptains.map(({ captain, ...team }) => team);

    return {
      team1: teams[0],
      team2: teams[1],
      team1Wins: teams[0].wins || 0,
      team2Wins: teams[1].wins || 0,
    };
  }

  async getRecentMatches(seriesId: number, limit: number = 5): Promise<Match[]> {
    return await db.select().from(matches)
      .where(eq(matches.seriesId, seriesId))
      .orderBy(desc(matches.matchDate))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
