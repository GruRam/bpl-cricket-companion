import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit } from "lucide-react";
import type { CurrentMatch, BallEntry } from "@/lib/types";

interface BallByBallScorerProps {
  match: CurrentMatch;
  onWicketClick: () => void;
}

export default function BallByBallScorer({ match, onWicketClick }: BallByBallScorerProps) {
  const [currentBalls, setCurrentBalls] = useState<(BallEntry | null)[]>([null, null, null, null, null, null]);

  const handleBallEntry = (ballIndex: number, entry: BallEntry) => {
    const newBalls = [...currentBalls];
    newBalls[ballIndex] = entry;
    setCurrentBalls(newBalls);
  };

  const quickEntryButtons = [
    { label: "0", value: { runs: 0, isWide: false, isNoBall: false, isWicket: false, extras: 0 }, color: "bg-blue-500 hover:bg-blue-600" },
    { label: "1", value: { runs: 1, isWide: false, isNoBall: false, isWicket: false, extras: 0 }, color: "bg-green-500 hover:bg-green-600" },
    { label: "2", value: { runs: 2, isWide: false, isNoBall: false, isWicket: false, extras: 0 }, color: "bg-green-500 hover:bg-green-600" },
    { label: "4", value: { runs: 4, isWide: false, isNoBall: false, isWicket: false, extras: 0 }, color: "bg-green-500 hover:bg-green-600" },
    { label: "6", value: { runs: 6, isWide: false, isNoBall: false, isWicket: false, extras: 0 }, color: "bg-green-500 hover:bg-green-600" },
    { label: "W", value: { runs: 0, isWide: false, isNoBall: false, isWicket: true, extras: 0 }, color: "bg-red-500 hover:bg-red-600" },
    { label: "WD", value: { runs: 1, isWide: true, isNoBall: false, isWicket: false, extras: 1 }, color: "bg-yellow-500 hover:bg-yellow-600" },
    { label: "NB", value: { runs: 1, isWide: false, isNoBall: true, isWicket: false, extras: 1 }, color: "bg-yellow-500 hover:bg-yellow-600" },
  ];

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
              <p className="text-sm text-gray-600">Bowler: {match.bowler.name}</p>
            </div>
            <Button variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-2" />
              Change Bowler
            </Button>
          </div>

          {/* Ball Entry Interface */}
          <div className="grid grid-cols-6 gap-2 mb-6">
            {currentBalls.map((ball, index) => (
              <div
                key={index}
                className={`ball-entry p-3 rounded-lg text-center cursor-pointer transition-all ${
                  ball
                    ? ball.isWicket
                      ? "bg-red-500 text-white"
                      : ball.isWide || ball.isNoBall
                      ? "bg-yellow-500 text-white"
                      : "bg-green-500 text-white"
                    : "bg-gray-100 border-2 border-dashed border-gray-300 hover:border-purple-400"
                }`}
                onClick={() => !ball && handleQuickEntry(quickEntryButtons[0].value)}
              >
                {ball ? (
                  <div className="font-semibold">
                    {ball.isWicket ? "W" : ball.isWide ? "WD" : ball.isNoBall ? "NB" : ball.runs}
                  </div>
                ) : (
                  <Plus className="w-4 h-4 mx-auto text-gray-400" />
                )}
              </div>
            ))}
          </div>

          {/* Quick Entry Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {quickEntryButtons.map((button, index) => (
              <Button
                key={index}
                className={`quick-entry ${button.color} text-white transition-all hover:scale-105`}
                onClick={() => handleQuickEntry(button.value)}
              >
                <div className="text-center">
                  <div className="font-semibold">{button.label}</div>
                  <div className="text-xs opacity-90">
                    {button.label === "0" ? "Dot Ball" :
                     button.label === "W" ? "Wicket" :
                     button.label === "WD" ? "Wide" :
                     button.label === "NB" ? "No Ball" :
                     button.label === "1" ? "Single" :
                     button.label === "2" ? "Double" :
                     button.label === "4" ? "Boundary" :
                     "Six"}
                  </div>
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
              <div className="text-sm text-gray-600 mb-1">{match.striker.name}</div>
              <div className="text-xl font-semibold text-gray-800">34* (28)</div>
              <Badge variant="secondary" className="mt-1">On Strike</Badge>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">{match.nonStriker.name}</div>
              <div className="text-xl font-semibold text-gray-800">18* (15)</div>
              <Badge variant="outline" className="mt-1">Non-Striker</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
