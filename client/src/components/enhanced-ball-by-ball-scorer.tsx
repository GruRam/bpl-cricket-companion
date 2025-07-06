import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, Edit, RotateCcw, ArrowRight, Users } from "lucide-react";
import type { CurrentMatch, BallEntry } from "@/lib/types";
import type { Player } from "@shared/schema";

interface BallByBallScorerProps {
  match: CurrentMatch;
  onWicketClick: () => void;
}

interface OverEntry {
  ballNumber: number;
  entry: BallEntry;
}

export default function BallByBallScorer({ match, onWicketClick }: BallByBallScorerProps) {
  const [currentBalls, setCurrentBalls] = useState<(BallEntry | null)[]>([null, null, null, null, null, null]);
  const [extraBalls, setExtraBalls] = useState<(BallEntry | null)[]>([]); // For wides and no-balls
  const [striker, setStriker] = useState(match.striker);
  const [nonStriker, setNonStriker] = useState(match.nonStriker);
  const [bowler, setBowler] = useState(match.bowler);
  const [editingBall, setEditingBall] = useState<number | null>(null);
  const [currentOverNumber, setCurrentOverNumber] = useState(1);
  const [showOverConfirmation, setShowOverConfirmation] = useState(false);
  const [matchProceedings, setMatchProceedings] = useState<string[]>([]);
  const [totalScore, setTotalScore] = useState({ runs: 0, wickets: 0, overs: 0, balls: 0 });

  // Get team players for contextual dropdowns
  const { data: battingPlayers = [] } = useQuery<Player[]>({
    queryKey: ["/api/teams", match.battingTeam.id, "players"],
    select: (data: any) => data.map((tp: any) => tp.player).sort((a: Player, b: Player) => a.name.localeCompare(b.name)),
  });

  const { data: bowlingPlayers = [] } = useQuery<Player[]>({
    queryKey: ["/api/teams", match.bowlingTeam.id, "players"],
    select: (data: any) => data.map((tp: any) => tp.player).sort((a: Player, b: Player) => a.name.localeCompare(b.name)),
  });

  // Auto-swap striker/non-striker based on runs scored
  const handleBallEntry = (ballIndex: number, entry: BallEntry) => {
    const updatedBalls = [...currentBalls];
    updatedBalls[ballIndex] = entry;
    setCurrentBalls(updatedBalls);

    // Update total score
    const newRuns = totalScore.runs + entry.runs + entry.extras;
    const newWickets = entry.isWicket ? totalScore.wickets + 1 : totalScore.wickets;
    const newBallCount = entry.isWide || entry.isNoBall ? totalScore.balls : totalScore.balls + 1;
    
    setTotalScore({
      runs: newRuns,
      wickets: newWickets,
      overs: Math.floor(newBallCount / 6),
      balls: newBallCount % 6
    });

    // Auto-swap batsmen for odd runs (1, 3, 5) on valid balls
    if (!entry.isWide && !entry.isNoBall && (entry.runs % 2 === 1)) {
      const tempStriker = striker;
      setStriker(nonStriker);
      setNonStriker(tempStriker);
    }

    // Check if over is complete (6 valid balls)
    const validBalls = updatedBalls.filter((ball: BallEntry | null) => ball && !ball.isWide && !ball.isNoBall).length;
    if (validBalls === 6) {
      setShowOverConfirmation(true);
    }
  };

  const handleWideOrNoBall = (entry: BallEntry) => {
    // Add as extra ball
    const newExtraBalls = [...extraBalls, entry];
    setExtraBalls(newExtraBalls);

    // Update score immediately
    const newRuns = totalScore.runs + entry.runs + entry.extras;
    setTotalScore(prev => ({
      ...prev,
      runs: newRuns
    }));

    // Add to match proceedings
    const proceeding = `Over ${currentOverNumber}: ${entry.isWide ? 'Wide' : 'No Ball'} + ${entry.runs} run${entry.runs !== 1 ? 's' : ''}`;
    setMatchProceedings(prev => [...prev, proceeding]);
  };

  const quickEntryButtons = [
    { label: "0", value: { runs: 0, isWide: false, isNoBall: false, isWicket: false, extras: 0 }, color: "bg-blue-500 hover:bg-blue-600" },
    { label: "1", value: { runs: 1, isWide: false, isNoBall: false, isWicket: false, extras: 0 }, color: "bg-green-500 hover:bg-green-600" },
    { label: "2", value: { runs: 2, isWide: false, isNoBall: false, isWicket: false, extras: 0 }, color: "bg-green-500 hover:bg-green-600" },
    { label: "3", value: { runs: 3, isWide: false, isNoBall: false, isWicket: false, extras: 0 }, color: "bg-green-500 hover:bg-green-600" },
    { label: "4", value: { runs: 4, isWide: false, isNoBall: false, isWicket: false, extras: 0 }, color: "bg-green-500 hover:bg-green-600" },
    { label: "5", value: { runs: 5, isWide: false, isNoBall: false, isWicket: false, extras: 0 }, color: "bg-green-500 hover:bg-green-600" },
    { label: "6", value: { runs: 6, isWide: false, isNoBall: false, isWicket: false, extras: 0 }, color: "bg-green-500 hover:bg-green-600" },
    { label: "W", value: { runs: 0, isWide: false, isNoBall: false, isWicket: true, extras: 0 }, color: "bg-red-500 hover:bg-red-600" },
    { label: "WD", value: { runs: 1, isWide: true, isNoBall: false, isWicket: false, extras: 1 }, color: "bg-yellow-500 hover:bg-yellow-600" },
    { label: "NB", value: { runs: 1, isWide: false, isNoBall: true, isWicket: false, extras: 1 }, color: "bg-yellow-500 hover:bg-yellow-600" },
  ];

  const swapBatsmen = () => {
    const temp = striker;
    setStriker(nonStriker);
    setNonStriker(temp);
  };

  const deleteBall = (ballIndex: number) => {
    const newBalls = [...currentBalls];
    newBalls[ballIndex] = null;
    setCurrentBalls(newBalls);
  };

  const handleQuickEntry = (entry: BallEntry) => {
    if (entry.isWide || entry.isNoBall) {
      handleWideOrNoBall(entry);
      return;
    }

    if (entry.isWicket) {
      onWicketClick();
      return;
    }

    const nextEmptyIndex = currentBalls.findIndex(ball => ball === null);
    if (nextEmptyIndex !== -1) {
      handleBallEntry(nextEmptyIndex, entry);
      
      // Add to match proceedings
      const proceeding = `Over ${currentOverNumber}.${nextEmptyIndex + 1}: ${entry.runs} run${entry.runs !== 1 ? 's' : ''} - ${striker.name}`;
      setMatchProceedings(prev => [...prev, proceeding]);
    }
  };

  const completeOver = () => {
    // Swap batsmen at end of over
    const temp = striker;
    setStriker(nonStriker);
    setNonStriker(temp);

    // Reset balls for next over
    setCurrentBalls([null, null, null, null, null, null]);
    setExtraBalls([]);
    setCurrentOverNumber(prev => prev + 1);
    setShowOverConfirmation(false);

    // Add over summary to proceedings
    const overRuns = currentBalls.reduce((total, ball) => {
      return total + (ball ? ball.runs + ball.extras : 0);
    }, 0) + extraBalls.reduce((total, ball) => {
      return total + (ball ? ball.runs + ball.extras : 0);
    }, 0);

    setMatchProceedings(prev => [...prev, `--- Over ${currentOverNumber} completed: ${overRuns} runs ---`]);
  };

  return (
    <div className="space-y-6">
      {/* Match Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                {match.team1.name} vs {match.team2.name}
              </h2>
              <p className="text-gray-600">
                {match.battingTeam.name} batting • {match.currentInnings === 1 ? "1st" : "2nd"} innings
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-800">
                {totalScore.runs}/{totalScore.wickets}
              </div>
              <div className="text-sm text-gray-600">
                {totalScore.overs}.{totalScore.balls} overs
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Partnership & Player Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Current Partnership
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Striker</label>
                <Select
                  value={striker.id.toString()}
                  onValueChange={(value) => {
                    const player = battingPlayers.find(p => p.id.toString() === value);
                    if (player) setStriker(player);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {battingPlayers.map(player => (
                      <SelectItem key={player.id} value={player.id.toString()}>
                        {player.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Non-Striker</label>
                <Select
                  value={nonStriker.id.toString()}
                  onValueChange={(value) => {
                    const player = battingPlayers.find(p => p.id.toString() === value);
                    if (player) setNonStriker(player);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {battingPlayers.filter(p => p.id !== striker.id).map(player => (
                      <SelectItem key={player.id} value={player.id.toString()}>
                        {player.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={swapBatsmen} variant="outline" className="w-full">
              <RotateCcw className="w-4 h-4 mr-2" />
              Swap Batsmen
            </Button>
          </CardContent>
        </Card>

        {/* Match Proceedings */}
        <Card>
          <CardHeader>
            <CardTitle>Match Proceedings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {matchProceedings.length === 0 ? (
                <p className="text-gray-500 text-sm">Match proceedings will appear here</p>
              ) : (
                matchProceedings.slice(-8).map((proceeding, index) => (
                  <div key={index} className="text-sm py-1 border-b border-gray-100 last:border-b-0">
                    {proceeding}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bowler Selection */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Current Bowler:</label>
            <Select
              value={bowler.id.toString()}
              onValueChange={(value) => {
                const player = bowlingPlayers.find(p => p.id.toString() === value);
                if (player) setBowler(player);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {bowlingPlayers.map(player => (
                  <SelectItem key={player.id} value={player.id.toString()}>
                    {player.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Over Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Over {currentOverNumber}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Over Balls */}
          <div className="grid grid-cols-6 gap-2">
            {currentBalls.map((ball, index) => (
              <div
                key={index}
                className={`h-12 border-2 border-dashed rounded-lg flex items-center justify-center relative ${
                  ball ? "border-green-300 bg-green-50" : "border-gray-300 bg-gray-50"
                }`}
              >
                {ball ? (
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-medium">
                      {ball.isWicket ? "W" : ball.runs}
                      {ball.isWide && " WD"}
                      {ball.isNoBall && " NB"}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-4 w-4 p-0 absolute -top-1 -right-1"
                      onClick={() => deleteBall(index)}
                    >
                      ×
                    </Button>
                  </div>
                ) : (
                  <span className="text-gray-400">{index + 1}</span>
                )}
              </div>
            ))}
          </div>

          {/* Extra Balls (Wides/No-balls) */}
          {extraBalls.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Extra Balls:</h4>
              <div className="flex gap-2">
                {extraBalls.map((ball, index) => (
                  <Badge key={index} variant="secondary">
                    {ball?.isWide ? "WD" : "NB"} +{ball?.runs}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Quick Entry Buttons */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Entry</h4>
            <div className="grid grid-cols-5 gap-2">
              {quickEntryButtons.map((button) => (
                <Button
                  key={button.label}
                  onClick={() => handleQuickEntry(button.value)}
                  className={`${button.color} text-white font-medium`}
                >
                  {button.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Over Completion Confirmation */}
          {showOverConfirmation && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-green-800">Over {currentOverNumber} Complete</h4>
                    <p className="text-sm text-green-600">Review the over and proceed to next over</p>
                  </div>
                  <Button onClick={completeOver} className="bg-green-600 hover:bg-green-700">
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Next Over
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}