export interface BallEntry {
  runs: number;
  isWide: boolean;
  isNoBall: boolean;
  isWicket: boolean;
  wicketType?: 'bowled' | 'caught' | 'boundary_out' | 'run_out' | 'stumped' | 'hit_wicket';
  wicketPlayerId?: number;
  fielderId?: number;
  extras: number;
}

export interface CurrentMatch {
  id: number;
  team1: { id: number; name: string };
  team2: { id: number; name: string };
  currentInnings: number;
  battingTeam: { id: number; name: string };
  bowlingTeam: { id: number; name: string };
  score: { runs: number; wickets: number; overs: number; balls: number };
  currentOver: number;
  currentBall: number;
  striker: { id: number; name: string };
  nonStriker: { id: number; name: string };
  bowler: { id: number; name: string };
}

export interface PlayerStat {
  playerId: number;
  name: string;
  position: string;
  matches: number;
  runs: number;
  balls: number;
  average: number;
  strikeRate: number;
  wickets: number;
  catches: number;
  wins: number;
  highestScore: number;
}
