import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Settings } from "lucide-react";
import BallByBallScorer from "@/components/ball-by-ball-scorer";
import WicketDetailsModal from "@/components/modals/wicket-details-modal";
import type { CurrentMatch } from "@/lib/types";

export default function Match() {
  const [matchStarted, setMatchStarted] = useState(false);
  const [firstBattingTeam, setFirstBattingTeam] = useState("");
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [currentMatch, setCurrentMatch] = useState<CurrentMatch | null>(null);

  const { data: activeSeries } = useQuery({
    queryKey: ["/api/series/active"],
  });

  const { data: teams } = useQuery({
    queryKey: ["/api/series", activeSeries?.id, "teams"],
    enabled: !!activeSeries?.id,
  });

  const handleStartMatch = () => {
    if (!teams || teams.length < 2 || !firstBattingTeam) return;

    const team1 = teams[0];
    const team2 = teams[1];
    
    const match: CurrentMatch = {
      id: Date.now(), // Temporary ID
      team1: { id: team1.id, name: team1.name },
      team2: { id: team2.id, name: team2.name },
      currentInnings: 1,
      battingTeam: firstBattingTeam === "team1" ? { id: team1.id, name: team1.name } : { id: team2.id, name: team2.name },
      bowlingTeam: firstBattingTeam === "team1" ? { id: team2.id, name: team2.name } : { id: team1.id, name: team1.name },
      score: { runs: 0, wickets: 0, overs: 0, balls: 0 },
      currentOver: 1,
      currentBall: 1,
      striker: { id: 1, name: "Player 1" },
      nonStriker: { id: 2, name: "Player 2" },
      bowler: { id: 3, name: "Bowler 1" },
    };

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
            {teams && teams.length >= 2 && (
              <>
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    {teams[0].name} vs {teams[1].name}
                  </h3>
                  <p className="text-gray-600">Select which team bats first</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">
                    First Batting Team
                  </Label>
                  <Select value={firstBattingTeam} onValueChange={setFirstBattingTeam}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select first batting team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="team1">{teams[0].name}</SelectItem>
                      <SelectItem value="team2">{teams[1].name}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleStartMatch}
                  disabled={!firstBattingTeam}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Match
                </Button>
              </>
            )}
            
            {(!teams || teams.length < 2) && (
              <div className="text-center py-8">
                <p className="text-gray-600">No teams found for this series. Please set up teams first.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
