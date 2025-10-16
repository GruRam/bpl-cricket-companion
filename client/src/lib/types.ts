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
  unavailablePlayers?: number[]; // IDs of players marked as unavailable
  commonPlayers?: { id: number; name: string }[]; // Players who can play for both teams
  oversPerSide: number; // Total overs allowed per innings
}

export interface SavedMatchState {
  // Match context
  match: CurrentMatch;
  
  // Game state
  currentInnings: number;
  currentOver: number;
  currentBallInOver: number;
  ballPosition: number;
  totalScore: { runs: number; wickets: number; overs: number; balls: number };
  runRate: number;
  
  // Players
  striker: { id: number; name: string };
  nonStriker: { id: number; name: string };
  bowler: { id: number; name: string };
  previousBowler?: { id: number; name: string } | null;
  dismissedPlayers: number[];
  
  // Match state
  isInningsComplete: boolean;
  isMatchComplete: boolean;
  matchWinner?: { teamName: string; margin: string } | null;
  showInningsBreak: boolean;
  firstInningsScore: { runs: number; wickets: number; overs: number; balls: number } | null;
  
  // Ball data
  allBalls: any[];
  overBalls: any[];
  
  // Flags
  needsBowlerChange: boolean;
  needsBatsmanChange: boolean;
  needsInningsSetup?: boolean;
  singleBattingMode: boolean;
  
  // Timestamp
  savedAt: string;
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
