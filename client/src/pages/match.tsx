import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Settings, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import AdvancedBallByBallScorer from "@/components/advanced-ball-by-ball-scorer";
import WicketDetailsModal from "@/components/modals/wicket-details-modal";
import MatchSetupModal from "@/components/modals/match-setup-modal";
import type { CurrentMatch } from "@/lib/types";

export default function Match() {
  const [matchStarted, setMatchStarted] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [currentMatch, setCurrentMatch] = useState<CurrentMatch | null>(null);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [savedMatchState, setSavedMatchState] = useState<any>(null);

  const { data: activeSeries } = useQuery({
    queryKey: ["/api/series/active"],
  });

  // Check for saved match state on component mount
  useEffect(() => {
    if (activeSeries) {
      // Check if there's a saved match state
      const savedState = localStorage.getItem(`match_${activeSeries.id}`);
      if (savedState) {
        try {
          const state = JSON.parse(savedState);
          // Check if the match has actually started (has some scoring data)
          if (state.totalScore && (state.totalScore.runs > 0 || state.totalScore.wickets > 0 || state.allBalls?.length > 0)) {
            setSavedMatchState(state);
            setShowResumeModal(true);
          }
        } catch (error) {
          console.error('Error parsing saved match state:', error);
        }
      }
    }
  }, [activeSeries]);

  const handleMatchStart = (match: CurrentMatch) => {
    setCurrentMatch(match);
    setMatchStarted(true);
    setShowResumeModal(false);
  };

  const handleResumeMatch = () => {
    if (savedMatchState && activeSeries) {
      const resumedMatch: CurrentMatch = {
        id: activeSeries.id,
        team1: activeSeries.team1,
        team2: activeSeries.team2,
        currentInnings: 1,
        battingTeam: activeSeries.team1,
        bowlingTeam: activeSeries.team2,
        score: savedMatchState.totalScore,
        currentOver: savedMatchState.currentOver,
        currentBall: savedMatchState.currentBallInOver,
        striker: savedMatchState.striker,
        nonStriker: savedMatchState.nonStriker,
        bowler: savedMatchState.bowler,
      };
      setCurrentMatch(resumedMatch);
      setMatchStarted(true);
      setShowResumeModal(false);
    }
  };

  const handleStartNew = () => {
    // Clear saved match state
    if (activeSeries) {
      localStorage.removeItem(`match_${activeSeries.id}`);
    }
    setShowResumeModal(false);
    setShowSetupModal(true);
  };

  if (matchStarted && currentMatch) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdvancedBallByBallScorer
          match={currentMatch}
          onWicketClick={() => setShowWicketModal(true)}
        />
        <WicketDetailsModal
          isOpen={showWicketModal}
          onClose={() => setShowWicketModal(false)}
          match={currentMatch}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8">
          <div className="flex items-center space-x-2 mb-6">
            <Settings className="w-6 h-6 text-muted-foreground" />
            <h2 className="text-2xl font-bold text-foreground">Match Setup</h2>
          </div>

          <div className="space-y-6">
            {activeSeries ? (
              <div className="text-center">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Active Series: {activeSeries?.name}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Set new match under this series
                  </p>
                </div>
                <Button
                  onClick={() => setShowSetupModal(true)}
                  className="flex items-center space-x-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Match Setup</span>
                </Button>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <p>No active series found. Please set up a series first.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <MatchSetupModal
        isOpen={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        onMatchStart={handleMatchStart}
        activeSeries={activeSeries}
      />
      
      <Dialog open={showResumeModal} onOpenChange={setShowResumeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Resume Match?
            </DialogTitle>
            <DialogDescription>
              You have an ongoing match. Would you like to resume where you left off or start a new match?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-4 mt-4">
            <Button onClick={handleResumeMatch} className="flex-1">
              Resume Match
            </Button>
            <Button variant="outline" onClick={handleStartNew} className="flex-1">
              Start New Match
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
