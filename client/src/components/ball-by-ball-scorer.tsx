import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, RotateCcw } from "lucide-react";
import type { CurrentMatch, BallEntry } from "@/lib/types";

interface BallByBallScorerProps {
  match: CurrentMatch;
  onWicketClick: () => void;
}

export default function BallByBallScorer({ match, onWicketClick }: BallByBallScorerProps) {
  const [currentBalls, setCurrentBalls] = useState<(BallEntry | null)[]>([null, null, null, null, null, null]);
  const [striker, setStriker] = useState(match.striker.id);
  const [nonStriker, setNonStriker] = useState(match.nonStriker.id);
  const [bowler, setBowler] = useState(match.bowler.id);
  const [editingBall, setEditingBall] = useState<number | null>(null);

  // Get all players for dropdown selections
  const { data: players } = useQuery({
    queryKey: ["/api/players"],
  });

  const handleBallEntry = (ballIndex: number, entry: BallEntry) => {
    const newBalls = [...currentBalls];
    newBalls[ballIndex] = entry;
    setCurrentBalls(newBalls);
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

  const getPlayerName = (playerId: number) => {
    if (!players) return "Unknown Player";
    const player = players.find((p: any) => p.id === playerId);
    return player ? player.name : "Unknown Player";
  };

  const deleteBall = (ballIndex: number) => {
    const newBalls = [...currentBalls];
    newBalls[ballIndex] = null;
    setCurrentBalls(newBalls);
  };

  const handleQuickEntry = (entry: BallEntry) => {
    const nextEmptyIndex = currentBalls.findIndex(ball => ball === null);
    if (nextEmptyIndex !== -1) {
      if (entry.isWicket) {
        onWicketClick();
      } else {
        handleBallEntry(nextEmptyIndex, entry);
      }
    }
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
                {match.score.runs}/{match.score.wickets}
              </div>
              <div className="text-sm text-gray-600">
                {match.score.overs}.{match.score.balls} overs
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Over */}
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Over {match.currentOver}</h3>
              <div className="flex items-center space-x-4 mt-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Bowler:</span>
                  <Select value={bowler.toString()} onValueChange={(value) => setBowler(parseInt(value))}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {players?.map((player: any) => (
                        <SelectItem key={player.id} value={player.id.toString()}>
                          {player.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={swapBatsmen}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Swap Batsmen
            </Button>
          </div>

          {/* Ball Entry Interface */}
          <div className="grid grid-cols-6 gap-2 mb-6">
            {currentBalls.map((ball, index) => (
              <div key={index} className="relative">
                <div
                  className={`ball-entry p-3 rounded-lg text-center cursor-pointer transition-all ${
                    ball
                      ? ball.isWicket
                        ? "bg-red-500 text-white"
                        : ball.isWide || ball.isNoBall
                        ? "bg-yellow-500 text-white"
                        : "bg-green-500 text-white"
                      : "bg-gray-100 border-2 border-dashed border-gray-300 hover:border-purple-400"
                  }`}
                  onClick={() => !ball && setEditingBall(index)}
                >
                  {ball ? (
                    <div className="font-semibold">
                      {ball.isWicket ? "W" : ball.isWide ? "WD" : ball.isNoBall ? "NB" : ball.runs}
                    </div>
                  ) : (
                    <Plus className="w-4 h-4 mx-auto text-gray-400" />
                  )}
                </div>
                {ball && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute -top-2 -right-2 h-6 w-6 p-0 bg-red-500 text-white rounded-full hover:bg-red-600"
                    onClick={() => deleteBall(index)}
                  >
                    ×
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Quick Entry Buttons */}
          <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
            {quickEntryButtons.map((button, index) => (
              <Button
                key={index}
                className={`quick-entry ${button.color} text-white transition-all hover:scale-105`}
                onClick={() => {
                  if (editingBall !== null) {
                    handleBallEntry(editingBall, button.value);
                    setEditingBall(null);
                  } else {
                    handleQuickEntry(button.value);
                  }
                }}
              >
                <div className="text-center">
                  <div className="font-semibold">{button.label}</div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Partnership */}
      <Card>
        <CardContent className="p-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">Current Partnership</h4>
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-1">
                <span className="text-sm text-gray-600">Striker:</span>
                <Select value={striker.toString()} onValueChange={(value) => setStriker(parseInt(value))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {players?.map((player: any) => (
                      <SelectItem key={player.id} value={player.id.toString()}>
                        {player.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-xl font-semibold text-gray-800">0* (0)</div>
              <Badge variant="secondary" className="mt-1">On Strike</Badge>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-1">
                <span className="text-sm text-gray-600">Non-Striker:</span>
                <Select value={nonStriker.toString()} onValueChange={(value) => setNonStriker(parseInt(value))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {players?.map((player: any) => (
                      <SelectItem key={player.id} value={player.id.toString()}>
                        {player.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-xl font-semibold text-gray-800">0* (0)</div>
              <Badge variant="outline" className="mt-1">Non-Striker</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
