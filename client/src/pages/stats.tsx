import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Target, TrendingUp, Award } from "lucide-react";
import { Series, Player } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Stats() {
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>("all");

  const { data: activeSeries } = useQuery<Series>({
    queryKey: ["/api/series/active"],
  });

  const { data: seriesList = [] } = useQuery<Series[]>({
    queryKey: ["/api/series"],
  });

  const { data: players, isLoading: isLoadingPlayers } = useQuery<Player[]>({
    queryKey: ["/api/players"],
  });

  // Get global player stats
  const { data: allPlayerStats = [], isLoading: isLoadingStats } = useQuery<Array<{
    id: number;
    playerId: number;
    seriesId: number;
    totalRuns: number;
    totalBalls: number;
    totalWickets: number;
    totalCatches: number;
    totalStumpings: number;
    totalRunOuts: number;
    ballsBowled: number;
    runsConceded: number;
    highestScore: number;
    totalFours: number;
    totalSixes: number;
    totalOuts: number;
    matchesPlayed: number;
    totalWins: number;
    seriesWins: number;
    seriesPlayed: number;
    winsAsCaptain: number;
    captainSeriesPlayed: number;
    player: Player;
  }>>({
    queryKey: ["/api/stats/all"],
    refetchInterval: 5000, // Refresh every 5 seconds for real-time updates
  });

  // Filter stats by series if selected, otherwise show all
  const playerStats = selectedSeriesId !== "all"
    ? allPlayerStats.filter((s) => s.seriesId === parseInt(selectedSeriesId))
    : allPlayerStats;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getAvatarColor = (index: number) => {
    const colors = ['bg-green-500', 'bg-purple-500', 'bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-pink-500'];
    return colors[index % colors.length];
  };

  if (isLoadingPlayers || isLoadingStats) {
    return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center">Loading statistics...</div>
    </div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Player Statistics</h2>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">Series:</label>
          <Select value={selectedSeriesId} onValueChange={setSelectedSeriesId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Series" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Series</SelectItem>
              {seriesList.map((s) => (
                <SelectItem key={s.id} value={s.id.toString()}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="batting" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="batting" data-testid="tab-batting">
            <Target className="w-4 h-4 mr-2" />
            Batting
          </TabsTrigger>
          <TabsTrigger value="bowling" data-testid="tab-bowling">
            <TrendingUp className="w-4 h-4 mr-2" />
            Bowling
          </TabsTrigger>
          <TabsTrigger value="allround" data-testid="tab-allround">
            <Trophy className="w-4 h-4 mr-2" />
            All-Round
          </TabsTrigger>
        </TabsList>

        {/* Batting Tab */}
        <TabsContent value="batting" className="mt-0">
          <Card>
            <CardContent className="p-3 sm:p-4 md:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">Batting Leaderboard</h3>
              {playerStats && playerStats.length > 0 ? (
                <div className="overflow-x-auto -mx-3 sm:-mx-4 md:-mx-6">
                  <div className="inline-block min-w-full align-middle">
                    <table className="min-w-full table-auto text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 sm:p-2 text-xs sm:text-sm font-semibold text-foreground sticky left-0 bg-background z-10">Rank</th>
                          <th className="text-left p-2 text-xs sm:text-sm font-semibold text-foreground">Player</th>
                          <th className="text-center p-2 text-xs sm:text-sm font-semibold text-foreground">Mat</th>
                          <th className="text-center p-2 text-xs sm:text-sm font-semibold text-foreground">Runs</th>
                          <th className="text-center p-2 text-xs sm:text-sm font-semibold text-foreground">Balls</th>
                          <th className="text-center p-2 text-xs sm:text-sm font-semibold text-foreground">Avg</th>
                          <th className="text-center p-2 text-xs sm:text-sm font-semibold text-foreground">SR</th>
                          <th className="text-center p-2 text-xs sm:text-sm font-semibold text-foreground">4s</th>
                          <th className="text-center p-2 text-xs sm:text-sm font-semibold text-foreground">6s</th>
                          <th className="text-center p-2 text-xs sm:text-sm font-semibold text-foreground">HS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {playerStats
                          .filter(p => p.totalRuns > 0)
                          .sort((a, b) => b.totalRuns - a.totalRuns)
                          .map((stat, index) => {
                            // Average = runs per dismissal (total outs)
                            const battingAvg = (stat.totalOuts || 0) > 0 ? (stat.totalRuns / (stat.totalOuts || 1)) : (stat.totalRuns > 0 ? stat.totalRuns : 0);
                            const strikeRate = stat.totalBalls > 0 ? (stat.totalRuns / stat.totalBalls) * 100 : 0;
                            
                            return (
                              <tr key={`${stat.id}-${stat.playerId}-batting`} className="border-b hover:bg-muted/50">
                                <td className="p-1.5 sm:p-2 sticky left-0 bg-background z-10">
                                  <div className={`w-6 h-6 sm:w-7 sm:h-7 ${index < 3 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' : 'bg-muted'} rounded-full flex items-center justify-center text-white text-xs font-bold`}>
                                    {index + 1}
                                  </div>
                                </td>
                                <td className="p-1.5 sm:p-2">
                                  <div className="flex items-center space-x-1.5 sm:space-x-2">
                                    <div className={`w-5 h-5 sm:w-6 sm:h-6 ${getAvatarColor(index)} rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0`}>
                                      {getInitials(stat.player.name)}
                                    </div>
                                    <span className="font-medium text-foreground text-xs sm:text-sm whitespace-nowrap">{stat.player.name}</span>
                                  </div>
                                </td>
                                <td className="p-1.5 sm:p-2 text-center text-xs sm:text-sm text-muted-foreground">
                                  {stat.matchesPlayed || 0}
                                </td>
                                <td className="p-1.5 sm:p-2 text-center text-xs sm:text-sm text-foreground font-bold">
                                  {stat.totalRuns}
                                </td>
                                <td className="p-1.5 sm:p-2 text-center text-xs sm:text-sm text-muted-foreground">
                                  {stat.totalBalls}
                                </td>
                                <td className="p-1.5 sm:p-2 text-center text-xs sm:text-sm text-muted-foreground">
                                  {stat.totalBalls > 0 ? battingAvg.toFixed(1) : "-"}
                                </td>
                                <td className="p-1.5 sm:p-2 text-center text-xs sm:text-sm text-muted-foreground">
                                  {stat.totalBalls > 0 ? strikeRate.toFixed(1) : "-"}
                                </td>
                                <td className="p-1.5 sm:p-2 text-center text-xs sm:text-sm text-muted-foreground">
                                  {stat.totalFours || 0}
                                </td>
                                <td className="p-1.5 sm:p-2 text-center text-xs sm:text-sm text-muted-foreground">
                                  {stat.totalSixes || 0}
                                </td>
                                <td className="p-1.5 sm:p-2 text-center text-xs sm:text-sm text-foreground font-semibold">
                                  {stat.highestScore > 0 ? stat.highestScore : "-"}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                  <p>No batting stats available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bowling Tab */}
        <TabsContent value="bowling" className="mt-0">
          <Card>
            <CardContent className="p-3 sm:p-4 md:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">Bowling Leaderboard</h3>
              {playerStats && playerStats.length > 0 ? (
                <div className="overflow-x-auto -mx-3 sm:-mx-4 md:-mx-6">
                  <div className="inline-block min-w-full align-middle">
                    <table className="min-w-full table-auto text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 sm:p-2 text-xs sm:text-sm font-semibold text-foreground sticky left-0 bg-background z-10">Rank</th>
                          <th className="text-left p-2 text-xs sm:text-sm font-semibold text-foreground">Player</th>
                          <th className="text-center p-2 text-xs sm:text-sm font-semibold text-foreground">Mat</th>
                          <th className="text-center p-2 text-xs sm:text-sm font-semibold text-foreground">Overs</th>
                          <th className="text-center p-2 text-xs sm:text-sm font-semibold text-foreground">Wkts</th>
                          <th className="text-center p-2 text-xs sm:text-sm font-semibold text-foreground">Runs</th>
                          <th className="text-center p-2 text-xs sm:text-sm font-semibold text-foreground">Avg</th>
                          <th className="text-center p-2 text-xs sm:text-sm font-semibold text-foreground">Econ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {playerStats
                          .filter(p => p.totalWickets > 0)
                          .sort((a, b) => b.totalWickets - a.totalWickets)
                          .map((stat, index) => {
                            const bowlingAvg = stat.totalWickets > 0 ? stat.runsConceded / stat.totalWickets : 0;
                            const economy = stat.ballsBowled > 0 ? (stat.runsConceded / stat.ballsBowled) * 6 : 0;
                            const overs = Math.floor(stat.ballsBowled / 6);
                            const balls = stat.ballsBowled % 6;
                            const oversDisplay = balls > 0 ? `${overs}.${balls}` : `${overs}`;
                            
                            return (
                              <tr key={`${stat.id}-${stat.playerId}-bowling`} className="border-b hover:bg-muted/50">
                                <td className="p-1.5 sm:p-2 sticky left-0 bg-background z-10">
                                  <div className={`w-6 h-6 sm:w-7 sm:h-7 ${index < 3 ? 'bg-gradient-to-br from-red-400 to-red-600' : 'bg-muted'} rounded-full flex items-center justify-center text-white text-xs font-bold`}>
                                    {index + 1}
                                  </div>
                                </td>
                                <td className="p-1.5 sm:p-2">
                                  <div className="flex items-center space-x-1.5 sm:space-x-2">
                                    <div className={`w-5 h-5 sm:w-6 sm:h-6 ${getAvatarColor(index)} rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0`}>
                                      {getInitials(stat.player.name)}
                                    </div>
                                    <span className="font-medium text-foreground text-xs sm:text-sm whitespace-nowrap">{stat.player.name}</span>
                                  </div>
                                </td>
                                <td className="p-1.5 sm:p-2 text-center text-xs sm:text-sm text-muted-foreground">
                                  {stat.matchesPlayed || 0}
                                </td>
                                <td className="p-1.5 sm:p-2 text-center text-xs sm:text-sm text-muted-foreground">
                                  {stat.ballsBowled > 0 ? oversDisplay : "-"}
                                </td>
                                <td className="p-1.5 sm:p-2 text-center text-xs sm:text-sm text-foreground font-bold">
                                  {stat.totalWickets}
                                </td>
                                <td className="p-1.5 sm:p-2 text-center text-xs sm:text-sm text-muted-foreground">
                                  {stat.runsConceded}
                                </td>
                                <td className="p-1.5 sm:p-2 text-center text-xs sm:text-sm text-muted-foreground">
                                  {stat.totalWickets > 0 ? bowlingAvg.toFixed(1) : "-"}
                                </td>
                                <td className="p-1.5 sm:p-2 text-center text-xs sm:text-sm text-muted-foreground">
                                  {stat.ballsBowled > 0 ? economy.toFixed(1) : "-"}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                  <p>No bowling stats available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* All-Round Tab */}
        <TabsContent value="allround" className="mt-0">
          <Card>
            <CardContent className="p-3 sm:p-4 md:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">All-Round Performance</h3>
              {playerStats && playerStats.length > 0 ? (
                <div className="overflow-x-auto -mx-3 sm:-mx-4 md:-mx-6">
                  <div className="inline-block min-w-full align-middle">
                    <table className="min-w-full table-auto text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 text-xs sm:text-sm font-semibold text-foreground sticky left-0 bg-background z-10">Player</th>
                          <th className="text-center p-2 text-xs sm:text-sm font-semibold text-foreground">Mat</th>
                          <th className="text-center p-2 text-xs sm:text-sm font-semibold text-foreground">Runs</th>
                          <th className="text-center p-2 text-xs sm:text-sm font-semibold text-foreground">Wkts</th>
                          <th className="text-center p-2 text-xs sm:text-sm font-semibold text-foreground">Ctch</th>
                          <th className="text-center p-2 text-xs sm:text-sm font-semibold text-foreground">St</th>
                          <th className="text-center p-2 text-xs sm:text-sm font-semibold text-foreground">RO</th>
                          <th className="text-center p-2 text-xs sm:text-sm font-semibold text-foreground">Wins</th>
                          <th className="text-center p-2 text-xs sm:text-sm font-semibold text-foreground">Series Win %</th>
                          <th className="text-center p-2 text-xs sm:text-sm font-semibold text-foreground">Captain Win %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {playerStats
                          .sort((a, b) => {
                            const aTotal = a.totalRuns + (a.totalWickets * 20) + (a.totalCatches * 10) + ((a.totalStumpings || 0) * 15) + ((a.totalRunOuts || 0) * 15);
                            const bTotal = b.totalRuns + (b.totalWickets * 20) + (b.totalCatches * 10) + ((b.totalStumpings || 0) * 15) + ((b.totalRunOuts || 0) * 15);
                            return bTotal - aTotal;
                          })
                          .map((stat, index) => {
                            return (
                              <tr key={`${stat.id}-${stat.playerId}-allround`} className="border-b hover:bg-muted/50">
                                <td className="p-1.5 sm:p-2 sticky left-0 bg-background z-10">
                                  <div className="flex items-center space-x-1.5 sm:space-x-2">
                                    <div className={`w-5 h-5 sm:w-6 sm:h-6 ${getAvatarColor(index)} rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0`}>
                                      {getInitials(stat.player.name)}
                                    </div>
                                    <span className="font-medium text-foreground text-xs sm:text-sm whitespace-nowrap">{stat.player.name}</span>
                                  </div>
                                </td>
                                <td className="p-1.5 sm:p-2 text-center text-xs sm:text-sm text-muted-foreground">
                                  {stat.matchesPlayed || 0}
                                </td>
                                <td className="p-1.5 sm:p-2 text-center text-xs sm:text-sm text-foreground font-semibold">
                                  {stat.totalRuns}
                                </td>
                                <td className="p-1.5 sm:p-2 text-center text-xs sm:text-sm text-foreground font-semibold">
                                  {stat.totalWickets}
                                </td>
                                <td className="p-1.5 sm:p-2 text-center text-xs sm:text-sm text-foreground font-semibold">
                                  {stat.totalCatches || 0}
                                </td>
                                <td className="p-1.5 sm:p-2 text-center text-xs sm:text-sm text-foreground font-semibold">
                                  {stat.totalStumpings || 0}
                                </td>
                                <td className="p-1.5 sm:p-2 text-center text-xs sm:text-sm text-foreground font-semibold">
                                  {stat.totalRunOuts || 0}
                                </td>
                                <td className="p-1.5 sm:p-2 text-center text-xs sm:text-sm text-purple-600 dark:text-purple-400 font-bold">
                                  {stat.totalWins || 0}
                                </td>
                                <td className="p-1.5 sm:p-2 text-center text-xs sm:text-sm text-muted-foreground">
                                  {stat.seriesPlayed > 0 ? ((stat.seriesWins / stat.seriesPlayed) * 100).toFixed(0) : '0'}%
                                </td>
                                <td className="p-1.5 sm:p-2 text-center text-xs sm:text-sm text-muted-foreground">
                                  {stat.captainSeriesPlayed > 0 ? ((stat.winsAsCaptain / stat.captainSeriesPlayed) * 100).toFixed(0) : '0'}%
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                  <p>No stats available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
