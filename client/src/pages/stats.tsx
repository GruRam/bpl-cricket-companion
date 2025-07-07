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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Statistics</h2>
        <div className="flex space-x-2">
          <Button
            variant={activeFilter === 'individual' ? 'default' : 'outline'}
            onClick={() => setActiveFilter('individual')}
            className={activeFilter === 'individual' ? 'bg-purple-600 hover:bg-purple-700' : ''}
          >
            Individual
          </Button>
          <Button
            variant={activeFilter === 'team' ? 'default' : 'outline'}
            onClick={() => setActiveFilter('team')}
            className={activeFilter === 'team' ? 'bg-purple-600 hover:bg-purple-700' : ''}
          >
            Team
          </Button>
        </div>
      </div>

      {activeFilter === 'individual' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Batsmen */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                <Target className="w-5 h-5 mr-2 text-green-600" />
                Top Batsmen
              </h3>
              {players && players.length > 0 ? (
                <div className="space-y-4">
                  {players.slice(0, 3).map((player: any, index: number) => (
                    <div key={player.id} className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 ${getAvatarColor(index)} rounded-full flex items-center justify-center text-white text-sm font-semibold`}>
                          {getInitials(player.name)}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{player.name}</div>
                          <div className="text-sm text-muted-foreground">Avg: 0.0 | SR: 0.0</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-foreground">0</div>
                        <div className="text-sm text-muted-foreground">runs</div>
                      </div>
                    </div>
                  ))}
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
              {players && players.length > 0 ? (
                <div className="space-y-4">
                  {players.slice(0, 3).map((player: any, index: number) => (
                    <div key={player.id} className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 ${getAvatarColor(index + 3)} rounded-full flex items-center justify-center text-white text-sm font-semibold`}>
                          {getInitials(player.name)}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{player.name}</div>
                          <div className="text-sm text-muted-foreground">Avg: 0.0 | Econ: 0.0</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-foreground">0</div>
                        <div className="text-sm text-muted-foreground">wickets</div>
                      </div>
                    </div>
                  ))}
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
