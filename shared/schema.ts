import { pgTable, text, serial, integer, boolean, timestamp, json, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const series = pgTable("series", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  targetWins: integer("target_wins").default(13),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  seriesId: integer("series_id").references(() => series.id),
  captainId: integer("captain_id").references(() => players.id),
  wins: integer("wins").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const teamPlayers = pgTable("team_players", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").references(() => teams.id),
  playerId: integer("player_id").references(() => players.id),
  seriesId: integer("series_id").references(() => series.id),
});

export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  seriesId: integer("series_id").references(() => series.id),
  team1Id: integer("team1_id").references(() => teams.id),
  team2Id: integer("team2_id").references(() => teams.id),
  firstBattingTeamId: integer("first_batting_team_id").references(() => teams.id),
  winningTeamId: integer("winning_team_id").references(() => teams.id),
  isCompleted: boolean("is_completed").default(false),
  oversPerSide: integer("overs_per_side").notNull().default(8),
  matchDate: timestamp("match_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const matchPlayers = pgTable("match_players", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").references(() => matches.id),
  playerId: integer("player_id").references(() => players.id),
  teamId: integer("team_id").references(() => teams.id),
});

export const innings = pgTable("innings", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").references(() => matches.id),
  battingTeamId: integer("batting_team_id").references(() => teams.id),
  bowlingTeamId: integer("bowling_team_id").references(() => teams.id),
  inningsNumber: integer("innings_number"), // 1 or 2
  totalRuns: integer("total_runs").default(0),
  totalWickets: integer("total_wickets").default(0),
  totalOvers: integer("total_overs").default(0),
  totalBalls: integer("total_balls").default(0),
  isCompleted: boolean("is_completed").default(false),
});

export const overs = pgTable("overs", {
  id: serial("id").primaryKey(),
  inningsId: integer("innings_id").references(() => innings.id),
  overNumber: integer("over_number"),
  bowlerId: integer("bowler_id").references(() => players.id),
  runs: integer("runs").default(0),
  wickets: integer("wickets").default(0),
  isCompleted: boolean("is_completed").default(false),
});

export const balls = pgTable("balls", {
  id: serial("id").primaryKey(),
  overId: integer("over_id").references(() => overs.id),
  inningsId: integer("innings_id").references(() => innings.id),
  ballNumber: integer("ball_number"), // 1-6
  bowlerId: integer("bowler_id").references(() => players.id),
  strikerId: integer("striker_id").references(() => players.id),
  nonStrikerId: integer("non_striker_id").references(() => players.id),
  runs: integer("runs").default(0),
  isWide: boolean("is_wide").default(false),
  isNoBall: boolean("is_no_ball").default(false),
  isWicket: boolean("is_wicket").default(false),
  wicketType: text("wicket_type"), // bowled, caught, lbw, run_out, stumped, hit_wicket
  wicketPlayerId: integer("wicket_player_id").references(() => players.id),
  fielderId: integer("fielder_id").references(() => players.id),
  extras: integer("extras").default(0),
});

export const playerStats = pgTable("player_stats", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").references(() => players.id),
  seriesId: integer("series_id").references(() => series.id),
  matchesPlayed: integer("matches_played").default(0),
  totalRuns: integer("total_runs").default(0),
  totalBalls: integer("total_balls").default(0),
  totalWickets: integer("total_wickets").default(0),
  totalCatches: integer("total_catches").default(0),
  totalStumpings: integer("total_stumpings").default(0),
  totalRunOuts: integer("total_run_outs").default(0),
  totalWins: integer("total_wins").default(0),
  seriesWins: integer("series_wins").default(0),
  seriesPlayed: integer("series_played").default(0),
  winsAsCaptain: integer("wins_as_captain").default(0),
  captainSeriesPlayed: integer("captain_series_played").default(0),
  highestScore: integer("highest_score").default(0),
  totalFours: integer("total_fours").default(0),
  totalSixes: integer("total_sixes").default(0),
  totalOuts: integer("total_outs").default(0),
  ballsBowled: integer("balls_bowled").default(0),
  runsConceded: integer("runs_conceded").default(0),
}, (table) => ({
  uniquePlayerSeries: unique().on(table.playerId, table.seriesId),
}));

// Relations
export const playersRelations = relations(players, ({ many }) => ({
  teamPlayers: many(teamPlayers),
  matchPlayers: many(matchPlayers),
  stats: many(playerStats),
}));

export const seriesRelations = relations(series, ({ many }) => ({
  teams: many(teams),
  matches: many(matches),
  stats: many(playerStats),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  series: one(series, { fields: [teams.seriesId], references: [series.id] }),
  captain: one(players, { fields: [teams.captainId], references: [players.id] }),
  teamPlayers: many(teamPlayers),
  matchPlayers: many(matchPlayers),
}));

export const teamPlayersRelations = relations(teamPlayers, ({ one }) => ({
  team: one(teams, { fields: [teamPlayers.teamId], references: [teams.id] }),
  player: one(players, { fields: [teamPlayers.playerId], references: [players.id] }),
  series: one(series, { fields: [teamPlayers.seriesId], references: [series.id] }),
}));

export const matchesRelations = relations(matches, ({ one, many }) => ({
  series: one(series, { fields: [matches.seriesId], references: [series.id] }),
  team1: one(teams, { fields: [matches.team1Id], references: [teams.id] }),
  team2: one(teams, { fields: [matches.team2Id], references: [teams.id] }),
  firstBattingTeam: one(teams, { fields: [matches.firstBattingTeamId], references: [teams.id] }),
  winningTeam: one(teams, { fields: [matches.winningTeamId], references: [teams.id] }),
  matchPlayers: many(matchPlayers),
  innings: many(innings),
}));

export const matchPlayersRelations = relations(matchPlayers, ({ one }) => ({
  match: one(matches, { fields: [matchPlayers.matchId], references: [matches.id] }),
  player: one(players, { fields: [matchPlayers.playerId], references: [players.id] }),
  team: one(teams, { fields: [matchPlayers.teamId], references: [teams.id] }),
}));

export const inningsRelations = relations(innings, ({ one, many }) => ({
  match: one(matches, { fields: [innings.matchId], references: [matches.id] }),
  battingTeam: one(teams, { fields: [innings.battingTeamId], references: [teams.id] }),
  bowlingTeam: one(teams, { fields: [innings.bowlingTeamId], references: [teams.id] }),
  overs: many(overs),
  balls: many(balls),
}));

export const oversRelations = relations(overs, ({ one, many }) => ({
  innings: one(innings, { fields: [overs.inningsId], references: [innings.id] }),
  bowler: one(players, { fields: [overs.bowlerId], references: [players.id] }),
  balls: many(balls),
}));

export const ballsRelations = relations(balls, ({ one }) => ({
  over: one(overs, { fields: [balls.overId], references: [overs.id] }),
  innings: one(innings, { fields: [balls.inningsId], references: [innings.id] }),
  bowler: one(players, { fields: [balls.bowlerId], references: [players.id] }),
  striker: one(players, { fields: [balls.strikerId], references: [players.id] }),
  nonStriker: one(players, { fields: [balls.nonStrikerId], references: [players.id] }),
  wicketPlayer: one(players, { fields: [balls.wicketPlayerId], references: [players.id] }),
  fielder: one(players, { fields: [balls.fielderId], references: [players.id] }),
}));

export const playerStatsRelations = relations(playerStats, ({ one }) => ({
  player: one(players, { fields: [playerStats.playerId], references: [players.id] }),
  series: one(series, { fields: [playerStats.seriesId], references: [series.id] }),
}));

// Insert schemas
export const insertPlayerSchema = createInsertSchema(players).omit({ id: true, createdAt: true });
export const insertSeriesSchema = createInsertSchema(series).omit({ id: true, createdAt: true });
export const insertTeamSchema = createInsertSchema(teams).omit({ id: true, createdAt: true });
export const insertMatchSchema = createInsertSchema(matches).omit({ id: true, createdAt: true });
export const insertBallSchema = createInsertSchema(balls).omit({ id: true });

// Types
export type Player = typeof players.$inferSelect;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Series = typeof series.$inferSelect;
export type InsertSeries = z.infer<typeof insertSeriesSchema>;
export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Match = typeof matches.$inferSelect;
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Ball = typeof balls.$inferSelect;
export type InsertBall = z.infer<typeof insertBallSchema>;
export type Innings = typeof innings.$inferSelect;
export type Over = typeof overs.$inferSelect;
export type PlayerStats = typeof playerStats.$inferSelect;
export type TeamPlayer = typeof teamPlayers.$inferSelect;
export type MatchPlayer = typeof matchPlayers.$inferSelect;
