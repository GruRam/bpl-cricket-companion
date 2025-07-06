import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Users, BarChart3, TrendingUp, Plus } from "lucide-react";
import { Link } from "wouter";
import CreateSeriesModal from "@/components/modals/create-series-modal";
import { Series, Match, Team } from "@shared/schema";

export default function Home() {
  const [showCreateSeriesModal, setShowCreateSeriesModal] = useState(false);
  
  const { data: activeSeries, isLoading: isLoadingActiveSeries } = useQuery<Series>({
    queryKey: ["/api/series/active"],
  });

  const { data: seriesProgress } = useQuery<{ team1Wins: number; team2Wins: number; team1: Team; team2: Team }>({
    queryKey: [`/api/series/${activeSeries?.id}/progress`],
    enabled: !!activeSeries?.id,
  });

  const { data: recentMatches } = useQuery<Match[]>({
    queryKey: [`/api/series/${activeSeries?.id}/recent-matches`],
    enabled: !!activeSeries?.id,
  });

  if (isLoadingActiveSeries) {
    return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center">Loading...</div>
    </div>;
  }

  if (!activeSeries) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">No Active Series</h2>
          <p className="text-gray-600 mb-6">Create a new series to get started</p>
          <Button 
            onClick={() => setShowCreateSeriesModal(true)}
            className="cricket-gradient text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Series
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Current Series Header */}
      <div className="cricket-gradient rounded-xl p-6 mb-8 text-white shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold mb-2">{activeSeries.name}</h2>
            <p className="text-white/90">
              First to {activeSeries.targetWins} wins
              {seriesProgress && ` • Currently ${seriesProgress.team1Wins}-${seriesProgress.team2Wins}`}
            </p>
          </div>

        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setShowCreateSeriesModal(true)}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Set up Series</h3>
                <p className="text-gray-600">Create new series with teams</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Link href="/match">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Start New Match</h3>
                  <p className="text-gray-600">Begin scoring a match</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Play className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/stats">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">View Stats</h3>
                  <p className="text-gray-600">Check performance statistics</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>


      </div>

      {/* Series Progress */}
      {seriesProgress && (
        <Card className="mb-8">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Series Progress</h3>
            <div className="flex items-center justify-between mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{seriesProgress.team1Wins}</div>
                <div className="text-sm text-gray-600">{seriesProgress.team1.name}</div>
              </div>
              <div className="flex-1 mx-8">
                <div className="bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-purple-400 to-green-400 h-3 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${(seriesProgress.team1Wins / activeSeries.targetWins) * 100}%` 
                    }}
                  />
                </div>
                <div className="text-center text-sm text-gray-600 mt-2">
                  First to {activeSeries.targetWins || 13} wins
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{seriesProgress.team2Wins}</div>
                <div className="text-sm text-gray-600">{seriesProgress.team2.name}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Matches */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Recent Matches</h3>
          {recentMatches && recentMatches.length > 0 ? (
            <div className="space-y-4">
              {recentMatches.map((match) => (
                <div key={match.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className={`w-2 h-2 rounded-full ${match.isCompleted ? 'bg-green-500' : 'bg-yellow-500'}`} />
                    <div>
                      <div className="font-medium text-gray-800">Match #{match.id}</div>
                      <div className="text-sm text-gray-600">
                        {new Date(match.matchDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-800">
                      {match.isCompleted ? 'Completed' : 'In Progress'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {match.winningTeamId ? `Winner: Team ${match.winningTeamId}` : 'Ongoing'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No matches played yet</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <CreateSeriesModal
        isOpen={showCreateSeriesModal}
        onClose={() => setShowCreateSeriesModal(false)}
      />
    </div>
  );
}
