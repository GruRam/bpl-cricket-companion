import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Award, Target } from "lucide-react";
import { Series, Player, Team } from "@shared/schema";

export default function Stats() {
  const [activeFilter, setActiveFilter] = useState<'individual' | 'team'>('individual');

  const { data: activeSeries, isLoading: isLoadingActiveSeries } = useQuery<Series>({
    queryKey: ["/api/series/active"],
  });

  const { data: players, isLoading: isLoadingPlayers } = useQuery<Player[]>({
    queryKey: ["/api/players"],
  });

  const { data: seriesProgress } = useQuery<{ team1Wins: number; team2Wins: number; team1: Team; team2: Team }>({
    queryKey: [`/api/series/${activeSeries?.id}/progress`],
    enabled: !!activeSeries?.id,
  });

  // Get real-time player stats for the active series
  const { data: playerStats = [], isLoading: isLoadingStats } = useQuery<Array<{
    id: number;
    playerId: number;
    seriesId: number;
    totalRuns: number;
    totalBalls: number;
    totalWickets: number;
    totalCatches: number;
    ballsBowled: number;
    runsConceded: number;
    highestScore: number;
    player: Player;
  }>>({
    queryKey: [`/api/series/${activeSeries?.id}/stats`],
    enabled: !!activeSeries?.id,
    refetchInterval: 5000, // Refresh every 5 seconds for real-time updates
  });

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (isLoadingActiveSeries || isLoadingPlayers) {
    return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center">Loading statistics...</div>
    </div>;
  }

  if (!activeSeries) {
    return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center">No active series found. Please create a series first.</div>
    </div>;
  }

  const getAvatarColor = (index: number) => {
    const colors = ['bg-green-500', 'bg-purple-500', 'bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-pink-500'];
    return colors[index % colors.length];
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground dark:text-foreground">Statistics</h2>
        <div className="flex space-x-2 w-full sm:w-auto">
          <Button
            data-testid="filter-individual"
            variant={activeFilter === 'individual' ? 'default' : 'outline'}
            onClick={() => setActiveFilter('individual')}
            className={`flex-1 sm:flex-none ${activeFilter === 'individual' ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
          >
            Individual
          </Button>
          <Button
            data-testid="filter-team"
            variant={activeFilter === 'team' ? 'default' : 'outline'}
            onClick={() => setActiveFilter('team')}
            className={`flex-1 sm:flex-none ${activeFilter === 'team' ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
          >
            Team
          </Button>
        </div>
      </div>

      {activeFilter === 'individual' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Top Batsmen */}
          <Card>
            <CardContent className="p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4 flex items-center">
                <Target className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-green-600" />
                Top Batsmen
              </h3>
              {playerStats && playerStats.length > 0 ? (
                <div className="space-y-4">
                  {playerStats
                    .filter(p => p.totalRuns > 0)
                    .sort((a, b) => b.totalRuns - a.totalRuns)
                    .slice(0, 5)
                    .map((stat, index) => {
                      const avg = stat.totalBalls > 0 ? (stat.totalRuns / Math.max(1, stat.totalBalls)) * 100 : 0;
                      const sr = stat.totalBalls > 0 ? (stat.totalRuns / stat.totalBalls) * 100 : 0;
                      return (
                        <div key={stat.playerId} className="flex justify-between items-center">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 ${getAvatarColor(index)} rounded-full flex items-center justify-center text-white text-sm font-semibold`}>
                              {getInitials(stat.player.name)}
                            </div>
                            <div>
                              <div className="font-medium text-foreground">{stat.player.name}</div>
                              <div className="text-sm text-muted-foreground">
                                Avg: {avg.toFixed(1)} | SR: {sr.toFixed(1)} | HS: {stat.highestScore}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-foreground">{stat.totalRuns}</div>
                            <div className="text-sm text-muted-foreground">runs ({stat.totalBalls}b)</div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                  <p>No batting stats available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Bowlers */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-red-600" />
                Top Bowlers
              </h3>
              {playerStats && playerStats.length > 0 ? (
                <div className="space-y-4">
                  {playerStats
                    .filter(p => p.totalWickets > 0)
                    .sort((a, b) => b.totalWickets - a.totalWickets)
                    .slice(0, 5)
                    .map((stat, index) => {
                      const bowlingAvg = stat.totalWickets > 0 ? stat.runsConceded / stat.totalWickets : 0;
                      const economy = stat.ballsBowled > 0 ? (stat.runsConceded / stat.ballsBowled) * 6 : 0;
                      const overs = Math.floor(stat.ballsBowled / 6);
                      const balls = stat.ballsBowled % 6;
                      return (
                        <div key={stat.playerId} className="flex justify-between items-center">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 ${getAvatarColor(index + 3)} rounded-full flex items-center justify-center text-white text-sm font-semibold`}>
                              {getInitials(stat.player.name)}
                            </div>
                            <div>
                              <div className="font-medium text-foreground">{stat.player.name}</div>
                              <div className="text-sm text-muted-foreground">
                                Avg: {bowlingAvg.toFixed(1)} | Econ: {economy.toFixed(1)} | O: {overs}.{balls}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-foreground">{stat.totalWickets}</div>
                            <div className="text-sm text-muted-foreground">wickets ({stat.runsConceded}r)</div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                  <p>No bowling stats available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Comprehensive Player Statistics Table */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Complete Player Statistics</h3>
            {playerStats && playerStats.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 text-sm font-semibold text-foreground">Player</th>
                      <th className="text-center p-2 text-sm font-semibold text-foreground">Batting</th>
                      <th className="text-center p-2 text-sm font-semibold text-foreground">Runs</th>
                      <th className="text-center p-2 text-sm font-semibold text-foreground">Balls</th>
                      <th className="text-center p-2 text-sm font-semibold text-foreground">Avg</th>
                      <th className="text-center p-2 text-sm font-semibold text-foreground">SR</th>
                      <th className="text-center p-2 text-sm font-semibold text-foreground">HS</th>
                      <th className="text-center p-2 text-sm font-semibold text-foreground">Bowling</th>
                      <th className="text-center p-2 text-sm font-semibold text-foreground">Overs</th>
                      <th className="text-center p-2 text-sm font-semibold text-foreground">Wickets</th>
                      <th className="text-center p-2 text-sm font-semibold text-foreground">Runs</th>
                      <th className="text-center p-2 text-sm font-semibold text-foreground">Econ</th>
                      <th className="text-center p-2 text-sm font-semibold text-foreground">Catches</th>
                    </tr>
                  </thead>
                  <tbody>
                    {playerStats
                      .sort((a, b) => b.totalRuns - a.totalRuns)
                      .map((stat, index) => {
                        const battingAvg = stat.totalBalls > 0 ? (stat.totalRuns / Math.max(1, stat.totalBalls)) * 100 : 0;
                        const strikeRate = stat.totalBalls > 0 ? (stat.totalRuns / stat.totalBalls) * 100 : 0;
                        const bowlingAvg = stat.totalWickets > 0 ? stat.runsConceded / stat.totalWickets : 0;
                        const economy = stat.ballsBowled > 0 ? (stat.runsConceded / stat.ballsBowled) * 6 : 0;
                        const overs = Math.floor(stat.ballsBowled / 6);
                        const balls = stat.ballsBowled % 6;
                        const oversDisplay = balls > 0 ? `${overs}.${balls}` : `${overs}`;
                        
                        return (
                          <tr key={stat.playerId} className="border-b hover:bg-muted/50">
                            <td className="p-2">
                              <div className="flex items-center space-x-2">
                                <div className={`w-6 h-6 ${getAvatarColor(index)} rounded-full flex items-center justify-center text-white text-xs font-semibold`}>
                                  {getInitials(stat.player.name)}
                                </div>
                                <span className="font-medium text-foreground">{stat.player.name}</span>
                              </div>
                            </td>
                            <td className="p-2 text-center text-sm text-muted-foreground">
                              {stat.totalRuns > 0 ? "✓" : "-"}
                            </td>
                            <td className="p-2 text-center text-sm text-foreground font-medium">
                              {stat.totalRuns}
                            </td>
                            <td className="p-2 text-center text-sm text-muted-foreground">
                              {stat.totalBalls}
                            </td>
                            <td className="p-2 text-center text-sm text-muted-foreground">
                              {stat.totalBalls > 0 ? battingAvg.toFixed(1) : "-"}
                            </td>
                            <td className="p-2 text-center text-sm text-muted-foreground">
                              {stat.totalBalls > 0 ? strikeRate.toFixed(1) : "-"}
                            </td>
                            <td className="p-2 text-center text-sm text-foreground font-medium">
                              {stat.highestScore > 0 ? stat.highestScore : "-"}
                            </td>
                            <td className="p-2 text-center text-sm text-muted-foreground">
                              {stat.ballsBowled > 0 ? "✓" : "-"}
                            </td>
                            <td className="p-2 text-center text-sm text-muted-foreground">
                              {stat.ballsBowled > 0 ? oversDisplay : "-"}
                            </td>
                            <td className="p-2 text-center text-sm text-foreground font-medium">
                              {stat.totalWickets}
                            </td>
                            <td className="p-2 text-center text-sm text-muted-foreground">
                              {stat.runsConceded}
                            </td>
                            <td className="p-2 text-center text-sm text-muted-foreground">
                              {stat.ballsBowled > 0 ? economy.toFixed(1) : "-"}
                            </td>
                            <td className="p-2 text-center text-sm text-foreground font-medium">
                              {stat.totalCatches}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Award className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                <p>No player statistics available</p>
              </div>
            )}
          </CardContent>
        </Card>
        </>
      )}

      {/* Series Progress */}
      {seriesProgress && activeSeries && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Series Progress</h3>
            <div className="flex items-center justify-between mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{seriesProgress.team1Wins}</div>
                <div className="text-sm text-muted-foreground">{seriesProgress.team1.name}</div>
              </div>
              <div className="flex-1 mx-8">
                <div className="bg-muted rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-purple-400 to-green-400 h-3 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${Math.max(seriesProgress.team1Wins, seriesProgress.team2Wins) / activeSeries.targetWins * 100}%` 
                    }}
                  />
                </div>
                <div className="text-center text-sm text-muted-foreground mt-2">
                  First to {activeSeries.targetWins} wins
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{seriesProgress.team2Wins}</div>
                <div className="text-sm text-muted-foreground">{seriesProgress.team2.name}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
