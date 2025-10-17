import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Users, BarChart3, TrendingUp, Plus, Trash2, RotateCcw } from "lucide-react";
import { Link, useLocation } from "wouter";
import CreateSeriesModal from "@/components/modals/create-series-modal";
import { Series, Match, Team } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [showCreateSeriesModal, setShowCreateSeriesModal] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
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

  const deleteMatchMutation = useMutation({
    mutationFn: async (matchId: number) => {
      await apiRequest("DELETE", `/api/matches/${matchId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/series/${activeSeries?.id}/recent-matches`] });
      queryClient.invalidateQueries({ queryKey: [`/api/series/${activeSeries?.id}/progress`] });
      toast({
        title: "Match Deleted",
        description: "The match has been removed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete match",
        variant: "destructive",
      });
    },
  });

  const handleResumeMatch = (matchId: number) => {
    // Store the match ID in localStorage for resume
    localStorage.setItem('resumeMatchId', matchId.toString());
    setLocation('/match');
  };

  const handleDeleteMatch = (matchId: number) => {
    if (confirm('Are you sure you want to delete this match? This action cannot be undone.')) {
      deleteMatchMutation.mutate(matchId);
    }
  };

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
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
      {/* Current Series Header */}
      <div className="cricket-gradient rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 text-white shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-1 sm:mb-2">
              {activeSeries.name.includes(' vs ') 
                ? activeSeries.name.split(' vs ').map(name => `Team ${name.trim()}`).join(' vs ')
                : activeSeries.name}
            </h2>
            <p className="text-xs sm:text-sm text-white/90">
              First to {activeSeries.targetWins} wins
              {seriesProgress && ` • Currently ${seriesProgress.team1Wins}-${seriesProgress.team2Wins}`}
            </p>
          </div>

        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <Card className="hover:shadow-md transition-shadow cursor-pointer active:scale-95 transition-transform" onClick={() => setShowCreateSeriesModal(true)}>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground">Set up Series</h3>
                <p className="text-sm text-muted-foreground">Create new series with teams</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0 ml-2">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Link href="/match">
          <Card className="hover:shadow-md transition-shadow cursor-pointer active:scale-95 transition-transform">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-foreground">Start New Match</h3>
                  <p className="text-sm text-muted-foreground">Begin scoring a match</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0 ml-2">
                  <Play className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/stats">
          <Card className="hover:shadow-md transition-shadow cursor-pointer active:scale-95 transition-transform">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-foreground">View Stats</h3>
                  <p className="text-sm text-muted-foreground">Check performance statistics</p>
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
            <h3 className="text-lg font-semibold text-foreground mb-4">Series Progress</h3>
            <div className="flex items-center justify-between mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{seriesProgress.team1Wins}</div>
                <div className="text-sm text-muted-foreground">{seriesProgress.team1.name}</div>
              </div>
              <div className="flex-1 mx-8">
                <div className="bg-muted rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-purple-400 to-green-400 h-3 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${(seriesProgress.team1Wins / (activeSeries?.targetWins || 13)) * 100}%` 
                    }}
                  />
                </div>
                <div className="text-center text-sm text-muted-foreground mt-2">
                  First to {activeSeries?.targetWins || 13} wins
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{seriesProgress.team2Wins}</div>
                <div className="text-sm text-muted-foreground">{seriesProgress.team2.name}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Matches */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-xl font-semibold text-foreground mb-4">Recent Matches</h3>
          {recentMatches && recentMatches.length > 0 ? (
            <div className="space-y-4">
              {recentMatches.map((match) => (
                <div key={match.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-muted/50 rounded-lg gap-3">
                  <div className="flex items-center space-x-4">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${match.isCompleted ? 'bg-green-500' : 'bg-yellow-500'}`} />
                    <div>
                      <div className="font-medium text-foreground">Match #{match.id}</div>
                      <div className="text-sm text-muted-foreground">
                        {match.matchDate ? new Date(match.matchDate).toLocaleDateString() : 'No date'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="text-right mr-2">
                      <div className="font-semibold text-foreground text-sm sm:text-base">
                        {match.isCompleted ? 'Completed' : 'In Progress'}
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        {match.winningTeamId ? `Winner: Team ${match.winningTeamId}` : 'Ongoing'}
                      </div>
                    </div>
                    {!match.isCompleted && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResumeMatch(match.id)}
                          data-testid={`button-resume-match-${match.id}`}
                          className="flex items-center gap-1"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span className="hidden sm:inline">Resume</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteMatch(match.id)}
                          disabled={deleteMatchMutation.isPending}
                          data-testid={`button-delete-match-${match.id}`}
                          className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="hidden sm:inline">Delete</span>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No matches played yet</p>
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
