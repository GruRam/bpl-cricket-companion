import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Settings } from "lucide-react";
import BallByBallScorer from "@/components/ball-by-ball-scorer";
import WicketDetailsModal from "@/components/modals/wicket-details-modal";
import MatchSetupModal from "@/components/modals/match-setup-modal";
import type { CurrentMatch } from "@/lib/types";

export default function Match() {
  const [matchStarted, setMatchStarted] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [currentMatch, setCurrentMatch] = useState<CurrentMatch | null>(null);

  const { data: activeSeries } = useQuery({
    queryKey: ["/api/series/active"],
  });

  const handleMatchStart = (match: CurrentMatch) => {
    setCurrentMatch(match);
    setMatchStarted(true);
  };

  if (matchStarted && currentMatch) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BallByBallScorer
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
            <Settings className="w-6 h-6 text-gray-600" />
            <h2 className="text-2xl font-bold text-gray-800">Match Setup</h2>
          </div>

          <div className="space-y-6">
            {activeSeries ? (
              <div className="text-center">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    Active Series: {activeSeries?.name}
                  </h3>
                  <p className="text-gray-600 mb-6">
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
              <div className="text-center text-gray-600">
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
    </div>
  );
}
