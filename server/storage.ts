import { 
  players, teams, series, matches, balls, overs, innings, playerStats, teamPlayers, matchPlayers,
  type Player, type InsertPlayer, type Series, type InsertSeries, type Team, type InsertTeam,
  type Match, type InsertMatch, type Ball, type InsertBall, type Innings, type Over,
  type PlayerStats, type TeamPlayer, type MatchPlayer
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export interface IStorage {
  // Players
  getPlayers(): Promise<Player[]>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  updatePlayer(id: number, updates: Partial<InsertPlayer>): Promise<Player>;
  
  // Series
  getSeries(): Promise<Series[]>;
  getSeriesById(id: number): Promise<Series | null>;
  getActiveSeries(): Promise<Series | null>;
  createSeries(series: InsertSeries): Promise<Series>;
  updateSeries(id: number, updates: Partial<InsertSeries>): Promise<Series>;
  
  // Teams
  getTeamsBySeries(seriesId: number): Promise<Team[]>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: number, updates: Partial<InsertTeam>): Promise<Team>;
  
  // Team Players
  getTeamPlayers(teamId: number): Promise<(TeamPlayer & { player: Player })[]>;
  getTeamPlayersForSeries(seriesId: number): Promise<TeamPlayer[]>;
  addPlayerToTeam(teamId: number, playerId: number, seriesId: number): Promise<void>;
  removePlayerFromTeam(teamId: number, playerId: number): Promise<void>;
  
  // Matches
  getMatchesBySeries(seriesId: number): Promise<Match[]>;
  getMatch(id: number): Promise<Match | null>;
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
  updatePlayerStatsFromBall(ballData: {
    strikerId: number;
    nonStrikerId: number;
    bowlerId: number;
    runs: number;
    isWicket: boolean;
    wicketPlayerId?: number;
    fielderId?: number;
    seriesId: number;
  }): Promise<void>;
  getAllPlayerStats(seriesId?: number): Promise<(PlayerStats & { player: Player })[]>;
  
  // Ball with auto-creation
  saveBallWithContext(ballData: {
    matchId: number;
    seriesId: number;
    inningsNumber: number;
    overNumber: number;
    ballNumber: number;
    strikerId: number;
    nonStrikerId: number;
    bowlerId: number;
    runs: number;
    isWide: boolean;
    isNoBall: boolean;
    isWicket: boolean;
    wicketType?: string;
    wicketPlayerId?: number;
    fielderId?: number;
    extras: number;
    battingTeamId: number;
    bowlingTeamId: number;
  }): Promise<Ball>;
  
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

  async getSeriesById(id: number): Promise<Series | null> {
    const [s] = await db.select().from(series).where(eq(series.id, id)).limit(1);
    return s || null;
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

  async getTeamsBySeries(seriesId: number): Promise<Team[]> {
    return await db.select().from(teams).where(eq(teams.seriesId, seriesId));
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

  async getTeamPlayersForSeries(seriesId: number): Promise<TeamPlayer[]> {
    return await db
      .select()
      .from(teamPlayers)
      .where(eq(teamPlayers.seriesId, seriesId));
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
  
  async getMatch(id: number): Promise<Match | null> {
    const [match] = await db.select().from(matches).where(eq(matches.id, id)).limit(1);
    return match || null;
  }

  async createMatch(match: InsertMatch): Promise<Match> {
    const [newMatch] = await db.insert(matches).values(match).returning();
    return newMatch;
  }

  async updateMatch(id: number, updates: Partial<InsertMatch>): Promise<Match> {
    const [updatedMatch] = await db.update(matches).set(updates).where(eq(matches.id, id)).returning();
    return updatedMatch;
  }

  async deleteMatch(id: number): Promise<void> {
    // Delete all related data first
    // Delete balls (through innings and overs)
    const matchInnings = await db.select().from(innings).where(eq(innings.matchId, id));
    for (const inning of matchInnings) {
      const inningOvers = await db.select().from(overs).where(eq(overs.inningsId, inning.id));
      for (const over of inningOvers) {
        await db.delete(balls).where(eq(balls.overId, over.id));
      }
      await db.delete(overs).where(eq(overs.inningsId, inning.id));
    }
    
    // Delete innings
    await db.delete(innings).where(eq(innings.matchId, id));
    
    // Delete match players
    await db.delete(matchPlayers).where(eq(matchPlayers.matchId, id));
    
    // Delete the match
    await db.delete(matches).where(eq(matches.id, id));
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

  async updatePlayerStatsFromBall(ballData: {
    strikerId: number;
    nonStrikerId: number;
    bowlerId: number;
    runs: number;
    isWicket: boolean;
    wicketType?: string;
    wicketPlayerId?: number;
    fielderId?: number;
    seriesId: number;
  }): Promise<void> {
    const { strikerId, nonStrikerId, bowlerId, runs, isWicket, wicketType, wicketPlayerId, fielderId, seriesId } = ballData;

    // Upsert striker stats
    const strikerUpdates: any = {
      totalRuns: sql`${playerStats.totalRuns} + ${runs}`,
      totalBalls: sql`${playerStats.totalBalls} + 1`,
      highestScore: sql`GREATEST(${playerStats.highestScore}, ${runs})`,
    };

    // Track 4s and 6s
    if (runs === 4) {
      strikerUpdates.totalFours = sql`${playerStats.totalFours} + 1`;
    } else if (runs === 6) {
      strikerUpdates.totalSixes = sql`${playerStats.totalSixes} + 1`;
    }

    await db.insert(playerStats)
      .values({
        playerId: strikerId,
        seriesId,
        totalRuns: runs,
        totalBalls: 1,
        highestScore: runs,
        totalFours: runs === 4 ? 1 : 0,
        totalSixes: runs === 6 ? 1 : 0,
      })
      .onConflictDoUpdate({
        target: [playerStats.playerId, playerStats.seriesId],
        set: strikerUpdates,
      });

    // Upsert bowler stats
    const bowlerUpdates: any = {
      ballsBowled: sql`${playerStats.ballsBowled} + 1`,
      runsConceded: sql`${playerStats.runsConceded} + ${runs}`,
    };
    
    if (isWicket && wicketPlayerId) {
      bowlerUpdates.totalWickets = sql`${playerStats.totalWickets} + 1`;
    }

    await db.insert(playerStats)
      .values({
        playerId: bowlerId,
        seriesId,
        ballsBowled: 1,
        runsConceded: runs,
        totalWickets: (isWicket && wicketPlayerId) ? 1 : 0,
      })
      .onConflictDoUpdate({
        target: [playerStats.playerId, playerStats.seriesId],
        set: bowlerUpdates,
      });

    // Update fielder stats based on wicket type
    if (isWicket && fielderId && wicketType) {
      const fielderUpdates: any = {};
      
      if (wicketType.toLowerCase() === 'caught') {
        fielderUpdates.totalCatches = sql`${playerStats.totalCatches} + 1`;
      } else if (wicketType.toLowerCase() === 'stumped') {
        fielderUpdates.totalStumpings = sql`${playerStats.totalStumpings} + 1`;
      } else if (wicketType.toLowerCase() === 'run out') {
        fielderUpdates.totalRunOuts = sql`${playerStats.totalRunOuts} + 1`;
      }

      if (Object.keys(fielderUpdates).length > 0) {
        await db.insert(playerStats)
          .values({
            playerId: fielderId,
            seriesId,
            totalCatches: wicketType.toLowerCase() === 'caught' ? 1 : 0,
            totalStumpings: wicketType.toLowerCase() === 'stumped' ? 1 : 0,
            totalRunOuts: wicketType.toLowerCase() === 'run out' ? 1 : 0,
          })
          .onConflictDoUpdate({
            target: [playerStats.playerId, playerStats.seriesId],
            set: fielderUpdates,
          });
      }
    }

    // Track totalOuts for dismissed players
    if (isWicket && wicketPlayerId) {
      await db.insert(playerStats)
        .values({
          playerId: wicketPlayerId,
          seriesId,
          totalOuts: 1,
        })
        .onConflictDoUpdate({
          target: [playerStats.playerId, playerStats.seriesId],
          set: {
            totalOuts: sql`${playerStats.totalOuts} + 1`,
          },
        });
    }
  }

  private async getOrCreatePlayerStats(playerId: number, seriesId: number): Promise<PlayerStats> {
    const existing = await db.select().from(playerStats)
      .where(and(eq(playerStats.playerId, playerId), eq(playerStats.seriesId, seriesId)))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    // Create new stats entry
    const [newStats] = await db.insert(playerStats).values({
      playerId,
      seriesId,
      matchesPlayed: 0,
      totalRuns: 0,
      totalBalls: 0,
      totalWickets: 0,
      totalCatches: 0,
      totalWins: 0,
      seriesWins: 0,
      seriesPlayed: 1,
      winsAsCaptain: 0,
      captainSeriesPlayed: 0,
      highestScore: 0,
      ballsBowled: 0,
      runsConceded: 0,
    }).returning();

    return newStats;
  }

  async getAllPlayerStats(seriesId?: number): Promise<(PlayerStats & { player: Player })[]> {
    if (seriesId) {
      return await db.select({
        id: playerStats.id,
        playerId: playerStats.playerId,
        seriesId: playerStats.seriesId,
        matchesPlayed: playerStats.matchesPlayed,
        totalRuns: playerStats.totalRuns,
        totalBalls: playerStats.totalBalls,
        totalWickets: playerStats.totalWickets,
        totalCatches: playerStats.totalCatches,
        totalStumpings: playerStats.totalStumpings,
        totalRunOuts: playerStats.totalRunOuts,
        totalWins: playerStats.totalWins,
        seriesWins: playerStats.seriesWins,
        seriesPlayed: playerStats.seriesPlayed,
        winsAsCaptain: playerStats.winsAsCaptain,
        captainSeriesPlayed: playerStats.captainSeriesPlayed,
        highestScore: playerStats.highestScore,
        totalFours: playerStats.totalFours,
        totalSixes: playerStats.totalSixes,
        totalOuts: playerStats.totalOuts,
        ballsBowled: playerStats.ballsBowled,
        runsConceded: playerStats.runsConceded,
        player: players,
      })
      .from(playerStats)
      .innerJoin(players, eq(playerStats.playerId, players.id))
      .where(eq(playerStats.seriesId, seriesId));
    } else {
      return await db.select({
        id: playerStats.id,
        playerId: playerStats.playerId,
        seriesId: playerStats.seriesId,
        matchesPlayed: playerStats.matchesPlayed,
        totalRuns: playerStats.totalRuns,
        totalBalls: playerStats.totalBalls,
        totalWickets: playerStats.totalWickets,
        totalCatches: playerStats.totalCatches,
        totalStumpings: playerStats.totalStumpings,
        totalRunOuts: playerStats.totalRunOuts,
        totalWins: playerStats.totalWins,
        seriesWins: playerStats.seriesWins,
        seriesPlayed: playerStats.seriesPlayed,
        winsAsCaptain: playerStats.winsAsCaptain,
        captainSeriesPlayed: playerStats.captainSeriesPlayed,
        highestScore: playerStats.highestScore,
        totalFours: playerStats.totalFours,
        totalSixes: playerStats.totalSixes,
        totalOuts: playerStats.totalOuts,
        ballsBowled: playerStats.ballsBowled,
        runsConceded: playerStats.runsConceded,
        player: players,
      })
      .from(playerStats)
      .innerJoin(players, eq(playerStats.playerId, players.id));
    }
  }

  async getSeriesProgress(seriesId: number): Promise<{ team1Wins: number; team2Wins: number; team1: Team; team2: Team }> {
    const teams = await this.getTeamsBySeries(seriesId);
    if (teams.length < 2) {
      throw new Error('Series must have at least 2 teams');
    }

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

  async getAllMatches(): Promise<Match[]> {
    return await db.select().from(matches)
      .orderBy(desc(matches.matchDate));
  }

  async getMatchScorecard(matchId: number): Promise<any> {
    // Get match details
    const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
    if (!match) {
      throw new Error('Match not found');
    }

    // Get all balls for this match with innings and over information
    const strikerAlias = alias(players, 'striker');
    const bowlerAlias = alias(players, 'bowler');
    
    const allBalls = await db.select({
      id: balls.id,
      inningsNumber: innings.inningsNumber,
      overNumber: overs.overNumber,
      ballNumber: balls.ballNumber,
      strikerId: balls.strikerId,
      nonStrikerId: balls.nonStrikerId,
      bowlerId: balls.bowlerId,
      runs: balls.runs,
      isWicket: balls.isWicket,
      wicketType: balls.wicketType,
      wicketPlayerId: balls.wicketPlayerId,
      fielderId: balls.fielderId,
      extras: balls.extras,
      isWide: balls.isWide,
      isNoBall: balls.isNoBall,
      striker: strikerAlias.name,
      bowler: bowlerAlias.name,
    })
    .from(balls)
    .leftJoin(overs, eq(balls.overId, overs.id))
    .leftJoin(innings, eq(balls.inningsId, innings.id))
    .leftJoin(strikerAlias, eq(balls.strikerId, strikerAlias.id))
    .leftJoin(bowlerAlias, eq(balls.bowlerId, bowlerAlias.id))
    .where(eq(innings.matchId, matchId))
    .orderBy(innings.inningsNumber, overs.overNumber, balls.ballNumber);

    // Get match players with teams
    const matchPlayerAlias = alias(players, 'matchPlayer');
    const matchPlayersData = await db.select({
      playerId: matchPlayers.playerId,
      teamId: matchPlayers.teamId,
      playerName: matchPlayerAlias.name,
    })
    .from(matchPlayers)
    .leftJoin(matchPlayerAlias, eq(matchPlayers.playerId, matchPlayerAlias.id))
    .where(eq(matchPlayers.matchId, matchId));

    // Get teams
    const [team1] = await db.select().from(teams).where(eq(teams.id, match.team1Id)).limit(1);
    const [team2] = await db.select().from(teams).where(eq(teams.id, match.team2Id)).limit(1);

    return {
      match,
      team1,
      team2,
      allBalls,
      matchPlayers: matchPlayersData,
    };
  }

  async saveBallWithContext(ballData: {
    matchId: number;
    seriesId: number;
    inningsNumber: number;
    overNumber: number;
    ballNumber: number;
    strikerId: number;
    nonStrikerId: number;
    bowlerId: number;
    runs: number;
    isWide: boolean;
    isNoBall: boolean;
    isWicket: boolean;
    wicketType?: string;
    wicketPlayerId?: number;
    fielderId?: number;
    extras: number;
    battingTeamId: number;
    bowlingTeamId: number;
  }): Promise<Ball> {
    // Get or create innings
    let inningsRecord = await db.select().from(innings)
      .where(and(
        eq(innings.matchId, ballData.matchId),
        eq(innings.inningsNumber, ballData.inningsNumber)
      ))
      .limit(1);

    let inningsId: number;
    if (inningsRecord.length === 0) {
      // Create new innings
      const [newInnings] = await db.insert(innings).values({
        matchId: ballData.matchId,
        battingTeamId: ballData.battingTeamId,
        bowlingTeamId: ballData.bowlingTeamId,
        inningsNumber: ballData.inningsNumber,
        totalRuns: 0,
        totalWickets: 0,
        totalOvers: 0,
        totalBalls: 0,
        isCompleted: false,
      }).returning();
      inningsId = newInnings.id;
    } else {
      inningsId = inningsRecord[0].id;
    }

    // Get or create over
    let overRecord = await db.select().from(overs)
      .where(and(
        eq(overs.inningsId, inningsId),
        eq(overs.overNumber, ballData.overNumber)
      ))
      .limit(1);

    let overId: number;
    if (overRecord.length === 0) {
      // Create new over
      const [newOver] = await db.insert(overs).values({
        inningsId,
        overNumber: ballData.overNumber,
        bowlerId: ballData.bowlerId,
        runs: 0,
        wickets: 0,
        isCompleted: false,
      }).returning();
      overId = newOver.id;
    } else {
      overId = overRecord[0].id;
    }

    // Create ball
    const [ball] = await db.insert(balls).values({
      overId,
      inningsId,
      ballNumber: ballData.ballNumber,
      bowlerId: ballData.bowlerId,
      strikerId: ballData.strikerId,
      nonStrikerId: ballData.nonStrikerId,
      runs: ballData.runs,
      isWide: ballData.isWide,
      isNoBall: ballData.isNoBall,
      isWicket: ballData.isWicket,
      wicketType: ballData.wicketType,
      wicketPlayerId: ballData.wicketPlayerId,
      fielderId: ballData.fielderId,
      extras: ballData.extras,
    }).returning();

    // Update player stats
    await this.updatePlayerStatsFromBall({
      strikerId: ballData.strikerId,
      nonStrikerId: ballData.nonStrikerId,
      bowlerId: ballData.bowlerId,
      runs: ballData.runs,
      isWicket: ballData.isWicket,
      wicketType: ballData.wicketType,
      wicketPlayerId: ballData.wicketPlayerId,
      fielderId: ballData.fielderId,
      seriesId: ballData.seriesId,
    });

    return ball;
  }
}

export const storage = new DatabaseStorage();
