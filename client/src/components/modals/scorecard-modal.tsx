import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface ScorecardModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchData: {
    match: {
      id: number;
      team1Id: number;
      team2Id: number;
      winningTeamId: number | null;
      isCompleted: boolean;
    };
    team1: {
      id: number;
      name: string;
    };
    team2: {
      id: number;
      name: string;
    };
    allBalls: Array<{
      inningsNumber: number;
      overNumber: number;
      ballNumber: number;
      runs: number;
      isWicket: boolean;
      wicketType: string | null;
      wicketPlayerId: number | null;
      fielderId: number | null;
      striker: string;
      bowler: string;
      extras: number;
      isWide: boolean;
      isNoBall: boolean;
    }>;
    matchPlayers: Array<{
      playerId: number;
      teamId: number;
      playerName: string;
    }>;
  };
}

export default function ScorecardModal({ isOpen, onClose, matchData }: ScorecardModalProps) {
  if (!matchData) return null;

  const { match, team1, team2, allBalls, matchPlayers } = matchData;

  // Separate balls by innings
  const firstInningsBalls = allBalls.filter(b => b.inningsNumber === 1);
  const secondInningsBalls = allBalls.filter(b => b.inningsNumber === 2);

  // Calculate innings scores
  const calculateInningsScore = (balls: typeof allBalls) => {
    let runs = 0, wickets = 0, totalBalls = 0;
    balls.forEach(ball => {
      runs += ball.runs + ball.extras;
      if (ball.isWicket) wickets++;
      if (!ball.isWide && !ball.isNoBall) totalBalls++;
    });
    const overs = Math.floor(totalBalls / 6);
    const ballsInOver = totalBalls % 6;
    return { runs, wickets, overs, balls: ballsInOver };
  };

  const firstInningsScore = calculateInningsScore(firstInningsBalls);
  const secondInningsScore = calculateInningsScore(secondInningsBalls);

  // Calculate batting stats for an innings
  const calculateBattingStats = (balls: typeof allBalls) => {
    const stats: Record<string, { runs: number; balls: number; fours: number; sixes: number; dismissal: string | null }> = {};
    
    balls.forEach(ball => {
      if (!stats[ball.striker]) {
        stats[ball.striker] = { runs: 0, balls: 0, fours: 0, sixes: 0, dismissal: null };
      }
      
      if (!ball.isWide && !ball.isNoBall) stats[ball.striker].balls++;
      stats[ball.striker].runs += ball.runs;
      if (ball.runs === 4) stats[ball.striker].fours++;
      if (ball.runs === 6) stats[ball.striker].sixes++;
      
      // Track dismissal by checking if wicketPlayerId matches any batsman in this innings
      if (ball.isWicket) {
        const wicketType = ball.wicketType || '';
        const fielderPlayer = matchPlayers.find(p => p.playerId === ball.fielderId);
        const fielderName = fielderPlayer?.playerName || '';
        
        // For run outs, the dismissed batsman might not be the striker
        // Use wicketPlayerId to find the dismissed player, but key by their current name in stats
        let batsmanOut = ball.striker; // Default to striker
        if (ball.wicketPlayerId) {
          const dismissedPlayer = matchPlayers.find(p => p.playerId === ball.wicketPlayerId);
          if (dismissedPlayer) {
            // Check if this player already has stats keyed by their name
            // Use the name that matches an existing key, or the canonical name
            batsmanOut = dismissedPlayer.playerName;
          }
        }
        
        let dismissalText = '';
        if (wicketType === 'Bowled') {
          dismissalText = `b. ${ball.bowler}`;
        } else if (wicketType === 'Caught') {
          dismissalText = fielderName ? `c. ${fielderName} b. ${ball.bowler}` : `c & b ${ball.bowler}`;
        } else if (wicketType === 'Run Out') {
          dismissalText = fielderName ? `run out (${fielderName})` : 'run out';
        } else if (wicketType === 'Stumped') {
          dismissalText = `st. ${fielderName} b. ${ball.bowler}`;
        } else if (wicketType === 'Hit Wicket') {
          dismissalText = `hit wicket b. ${ball.bowler}`;
        } else if (wicketType === 'Boundary Out') {
          dismissalText = 'boundary out';
        } else {
          dismissalText = wicketType.toLowerCase();
        }
        
        // Mark this batsman as dismissed in stats - use striker name for consistency
        // since batting stats are keyed by striker name
        const keyToUse = stats[batsmanOut] ? batsmanOut : ball.striker;
        if (!stats[keyToUse]) {
          stats[keyToUse] = { runs: 0, balls: 0, fours: 0, sixes: 0, dismissal: dismissalText };
        } else {
          stats[keyToUse].dismissal = dismissalText;
        }
      }
    });
    
    return stats;
  };

  // Calculate bowling stats for an innings
  const calculateBowlingStats = (balls: typeof allBalls) => {
    const stats: Record<string, { balls: number; runs: number; wickets: number; wides: number; noBalls: number }> = {};
    
    balls.forEach(ball => {
      if (!stats[ball.bowler]) {
        stats[ball.bowler] = { balls: 0, runs: 0, wickets: 0, wides: 0, noBalls: 0 };
      }
      
      if (!ball.isWide && !ball.isNoBall) stats[ball.bowler].balls++;
      stats[ball.bowler].runs += ball.runs + ball.extras;
      if (ball.isWicket) stats[ball.bowler].wickets++;
      if (ball.isWide) stats[ball.bowler].wides++;
      if (ball.isNoBall) stats[ball.bowler].noBalls++;
    });
    
    return stats;
  };

  const firstInningsBatting = calculateBattingStats(firstInningsBalls);
  const firstInningsBowling = calculateBowlingStats(firstInningsBalls);
  const secondInningsBatting = calculateBattingStats(secondInningsBalls);
  const secondInningsBowling = calculateBowlingStats(secondInningsBalls);

  // Determine which team batted first
  const team1BattedFirst = matchPlayers.find(p => p.teamId === team1.id && allBalls[0]?.striker === p.playerName);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">Match Scorecard - {team1.name} vs {team2.name}</DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-scorecard">
              <X className="h-4 w-4" />
            </Button>
          </div>
          {match.isCompleted && match.winningTeamId && (
            <p className="text-sm text-muted-foreground">
              Winner: {match.winningTeamId === team1.id ? team1.name : team2.name}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* First Innings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {team1BattedFirst ? team1.name : team2.name} - Innings 1
              </CardTitle>
              <div className="text-2xl font-bold text-foreground">
                {firstInningsScore.runs}/{firstInningsScore.wickets}
                <span className="text-sm text-muted-foreground ml-2">
                  ({firstInningsScore.overs}.{firstInningsScore.balls} Ov)
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Batting */}
                <div>
                  <h4 className="font-semibold mb-2">Batting</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2">Batsman</th>
                          <th className="text-left py-2 px-2">How Out</th>
                          <th className="text-right py-2 px-1">R</th>
                          <th className="text-right py-2 px-1">B</th>
                          <th className="text-right py-2 px-1">4s</th>
                          <th className="text-right py-2 px-1">6s</th>
                          <th className="text-right py-2 px-1">SR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(firstInningsBatting).map(([batsman, stat]) => {
                          const sr = stat.balls > 0 ? ((stat.runs / stat.balls) * 100).toFixed(1) : '0.0';
                          return (
                            <tr key={batsman} className="border-b">
                              <td className="py-2 px-2 font-medium">{batsman}</td>
                              <td className="py-2 px-2 text-muted-foreground text-xs">{stat.dismissal || 'not out'}</td>
                              <td className="py-2 px-1 text-right font-semibold">{stat.runs}</td>
                              <td className="py-2 px-1 text-right">{stat.balls}</td>
                              <td className="py-2 px-1 text-right">{stat.fours}</td>
                              <td className="py-2 px-1 text-right">{stat.sixes}</td>
                              <td className="py-2 px-1 text-right">{sr}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Bowling */}
                <div>
                  <h4 className="font-semibold mb-2">Bowling</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2">Bowler</th>
                          <th className="text-right py-2 px-1">O</th>
                          <th className="text-right py-2 px-1">R</th>
                          <th className="text-right py-2 px-1">W</th>
                          <th className="text-right py-2 px-1">ECON</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(firstInningsBowling).map(([bowler, stat]) => {
                          const overs = Math.floor(stat.balls / 6) + (stat.balls % 6 > 0 ? `.${stat.balls % 6}` : '');
                          const economy = stat.balls > 0 ? ((stat.runs / stat.balls) * 6).toFixed(2) : '0.00';
                          return (
                            <tr key={bowler} className="border-b">
                              <td className="py-2 px-2 font-medium">{bowler}</td>
                              <td className="py-2 px-1 text-right">{overs}</td>
                              <td className="py-2 px-1 text-right">{stat.runs}</td>
                              <td className="py-2 px-1 text-right font-semibold">{stat.wickets}</td>
                              <td className="py-2 px-1 text-right">{economy}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Second Innings */}
          {secondInningsBalls.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {team1BattedFirst ? team2.name : team1.name} - Innings 2
                </CardTitle>
                <div className="text-2xl font-bold text-foreground">
                  {secondInningsScore.runs}/{secondInningsScore.wickets}
                  <span className="text-sm text-muted-foreground ml-2">
                    ({secondInningsScore.overs}.{secondInningsScore.balls} Ov)
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Batting */}
                  <div>
                    <h4 className="font-semibold mb-2">Batting</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-2">Batsman</th>
                            <th className="text-left py-2 px-2">How Out</th>
                            <th className="text-right py-2 px-1">R</th>
                            <th className="text-right py-2 px-1">B</th>
                            <th className="text-right py-2 px-1">4s</th>
                            <th className="text-right py-2 px-1">6s</th>
                            <th className="text-right py-2 px-1">SR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(secondInningsBatting).map(([batsman, stat]) => {
                            const sr = stat.balls > 0 ? ((stat.runs / stat.balls) * 100).toFixed(1) : '0.0';
                            return (
                              <tr key={batsman} className="border-b">
                                <td className="py-2 px-2 font-medium">{batsman}</td>
                                <td className="py-2 px-2 text-muted-foreground text-xs">{stat.dismissal || 'not out'}</td>
                                <td className="py-2 px-1 text-right font-semibold">{stat.runs}</td>
                                <td className="py-2 px-1 text-right">{stat.balls}</td>
                                <td className="py-2 px-1 text-right">{stat.fours}</td>
                                <td className="py-2 px-1 text-right">{stat.sixes}</td>
                                <td className="py-2 px-1 text-right">{sr}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Bowling */}
                  <div>
                    <h4 className="font-semibold mb-2">Bowling</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-2">Bowler</th>
                            <th className="text-right py-2 px-1">O</th>
                            <th className="text-right py-2 px-1">R</th>
                            <th className="text-right py-2 px-1">W</th>
                            <th className="text-right py-2 px-1">ECON</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(secondInningsBowling).map(([bowler, stat]) => {
                            const overs = Math.floor(stat.balls / 6) + (stat.balls % 6 > 0 ? `.${stat.balls % 6}` : '');
                            const economy = stat.balls > 0 ? ((stat.runs / stat.balls) * 6).toFixed(2) : '0.00';
                            return (
                              <tr key={bowler} className="border-b">
                                <td className="py-2 px-2 font-medium">{bowler}</td>
                                <td className="py-2 px-1 text-right">{overs}</td>
                                <td className="py-2 px-1 text-right">{stat.runs}</td>
                                <td className="py-2 px-1 text-right font-semibold">{stat.wickets}</td>
                                <td className="py-2 px-1 text-right">{economy}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
