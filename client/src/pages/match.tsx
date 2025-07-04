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
  const [team1Name, setTeam1Name] = useState("");
  const [team2Name, setTeam2Name] = useState("");
  const [firstBattingTeam, setFirstBattingTeam] = useState("");
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [currentMatch, setCurrentMatch] = useState<CurrentMatch | null>(null);

  const { data: activeSeries } = useQuery({
    queryKey: ["/api/series/active"],
  });

  const handleStartMatch = () => {
    if (!team1Name || !team2Name || !firstBattingTeam) return;

    const match: CurrentMatch = {
      id: Date.now(), // Temporary ID
      team1: { id: 1, name: team1Name },
      team2: { id: 2, name: team2Name },
      currentInnings: 1,
      battingTeam: firstBattingTeam === "team1" ? { id: 1, name: team1Name } : { id: 2, name: team2Name },
      bowlingTeam: firstBattingTeam === "team1" ? { id: 2, name: team2Name } : { id: 1, name: team1Name },
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="team1" className="text-sm font-medium text-gray-700 mb-2">
                  Team 1 Name
                </Label>
                <Input
                  id="team1"
                  value={team1Name}
                  onChange={(e) => setTeam1Name(e.target.value)}
                  placeholder="Enter team 1 name"
                  className="w-full"
                />
              </div>
              <div>
                <Label htmlFor="team2" className="text-sm font-medium text-gray-700 mb-2">
                  Team 2 Name
                </Label>
                <Input
                  id="team2"
                  value={team2Name}
                  onChange={(e) => setTeam2Name(e.target.value)}
                  placeholder="Enter team 2 name"
                  className="w-full"
                />
              </div>
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
                  <SelectItem value="team1">{team1Name || "Team 1"}</SelectItem>
                  <SelectItem value="team2">{team2Name || "Team 2"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleStartMatch}
              disabled={!team1Name || !team2Name || !firstBattingTeam}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Match
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
