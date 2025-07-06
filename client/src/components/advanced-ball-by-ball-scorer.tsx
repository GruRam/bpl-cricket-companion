import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, Edit, RotateCcw, ArrowRight, Users, Play, Pause, 
  ChevronLeft, ChevronRight, Target, Clock, Trophy, AlertCircle,
  User, Circle
} from "lucide-react";
import type { CurrentMatch, BallEntry } from "@/lib/types";
import type { Player } from "@shared/schema";
import WicketDetailsModal from "@/components/modals/wicket-details-modal";

interface BallByBallScorerProps {
  match: CurrentMatch;
  onWicketClick: () => void;
  onWicketDetails?: (wicketDetails: {
    batsmanOut: string;
    dismissalType: string;
    fielder?: string;
  }) => void;
}

interface CompletedBall {
  ballNumber: number; // 1-6 for valid balls, 0 for extras
  entry: BallEntry;
  striker: string;
  nonStriker: string;
  bowler: string;
  overNumber: number;
  ballPosition: number; // Position in the over for display
  commentary: string;
}

export default function AdvancedBallByBallScorer({ match, onWicketClick, onWicketDetails }: BallByBallScorerProps) {
  // Match state
  const [currentInnings, setCurrentInnings] = useState(1);
  const [striker, setStriker] = useState(match.striker);
  const [nonStriker, setNonStriker] = useState(match.nonStriker);
  const [bowler, setBowler] = useState(match.bowler);
  const [totalScore, setTotalScore] = useState({ runs: 0, wickets: 0, overs: 0, balls: 0 });
  const [runRate, setRunRate] = useState(0);
  
  // Current over state
  const [currentOver, setCurrentOver] = useState(1);
  const [currentBallInOver, setCurrentBallInOver] = useState(1);
  const [overBalls, setOverBalls] = useState<CompletedBall[]>([]);
  const [allBalls, setAllBalls] = useState<CompletedBall[]>([]);
  const [ballPosition, setBallPosition] = useState(1); // Position in over for display
  const [needsBowlerChange, setNeedsBowlerChange] = useState(false);
  const [needsBatsmanChange, setNeedsBatsmanChange] = useState(false);
  const [pendingWicketDetails, setPendingWicketDetails] = useState<{
    batsmanOut: string;
    dismissalType: string;
    fielder?: string;
  } | null>(null);
  const [showWicketModal, setShowWicketModal] = useState(false);
  
  // UI state
  const [quickEntryMode, setQuickEntryMode] = useState(true);
  const [customEntry, setCustomEntry] = useState({
    runs: 0,
    isWide: false,
    isNoBall: false,
    isWicket: false,
    isBye: false,
    isLegBye: false,
    extras: 0
  });
  
  // Get team players for contextual dropdowns
  const { data: battingPlayers = [] } = useQuery<Player[]>({
    queryKey: ["/api/teams", match.battingTeam.id, "players"],
    select: (data: any) => data.map((tp: any) => tp.player).sort((a: Player, b: Player) => a.name.localeCompare(b.name)),
  });

  const { data: bowlingPlayers = [] } = useQuery<Player[]>({
    queryKey: ["/api/teams", match.bowlingTeam.id, "players"],
    select: (data: any) => data.map((tp: any) => tp.player).sort((a: Player, b: Player) => a.name.localeCompare(b.name)),
  });

  // Calculate run rate
  useEffect(() => {
    const totalBalls = (totalScore.overs * 6) + totalScore.balls;
    if (totalBalls > 0) {
      setRunRate((totalScore.runs / totalBalls) * 6);
    }
  }, [totalScore]);

  // Generate commentary for a ball
  const generateCommentary = (entry: BallEntry, striker: string, bowler: string): string => {
    let commentary = `${striker} faces ${bowler}`;
    
    if (entry.isWide) {
      commentary += ` - Wide ball`;
      if (entry.runs > 0) commentary += ` + ${entry.runs} run${entry.runs !== 1 ? 's' : ''}`;
    } else if (entry.isNoBall) {
      commentary += ` - No ball`;
      if (entry.runs > 0) commentary += ` + ${entry.runs} run${entry.runs !== 1 ? 's' : ''}`;
    } else if (entry.isWicket) {
      // Use pending wicket details if available, otherwise fallback to entry
      const wicketDetails = pendingWicketDetails;
      if (wicketDetails) {
        const dismissalType = wicketDetails.dismissalType;
        const batsmanOut = wicketDetails.batsmanOut === 'striker' ? striker : nonStriker.name;
        commentary += ` - OUT! ${batsmanOut} ${dismissalType}`;
        if (wicketDetails.fielder) {
          const fielderPlayer = bowlingPlayers.find(p => p.id.toString() === wicketDetails.fielder);
          if (fielderPlayer) {
            commentary += ` (caught by ${fielderPlayer.name})`;
          }
        }
      } else {
        const wicketType = entry.wicketType || 'dismissed';
        commentary += ` - OUT! ${wicketType.charAt(0).toUpperCase() + wicketType.slice(1).replace('_', ' ')}`;
      }
    } else {
      if (entry.runs === 0) commentary += ` - Dot ball`;
      else if (entry.runs === 1) commentary += ` - Single`;
      else if (entry.runs === 2) commentary += ` - Two runs`;
      else if (entry.runs === 3) commentary += ` - Three runs`;
      else if (entry.runs === 4) commentary += ` - FOUR!`;
      else if (entry.runs === 5) commentary += ` - Five runs`;
      else if (entry.runs === 6) commentary += ` - SIX!`;
    }
    
    return commentary;
  };

  // Handle wicket details from modal
  const handleWicketDetails = (wicketDetails: {
    batsmanOut: string;
    dismissalType: string;
    fielder?: string;
  }) => {
    setPendingWicketDetails(wicketDetails);
    if (onWicketDetails) {
      onWicketDetails(wicketDetails);
    }
  };

  // Handle ball entry
  const handleBallEntry = (entry: BallEntry) => {
    const isValidBall = !entry.isWide && !entry.isNoBall;
    const totalRuns = entry.runs + entry.extras;
    
    // Create completed ball record
    const completedBall: CompletedBall = {
      ballNumber: isValidBall ? currentBallInOver : 0, // 0 for extras
      entry,
      striker: striker.name,
      nonStriker: nonStriker.name,
      bowler: bowler.name,
      overNumber: currentOver,
      ballPosition: ballPosition,
      commentary: generateCommentary(entry, striker.name, bowler.name)
    };
    
    // Add to balls arrays
    setOverBalls(prev => [...prev, completedBall]);
    setAllBalls(prev => [...prev, completedBall]);
    
    // Update ball position for display
    setBallPosition(prev => prev + 1);
    
    // Update total score
    setTotalScore(prev => ({
      runs: prev.runs + totalRuns,
      wickets: entry.isWicket ? prev.wickets + 1 : prev.wickets,
      overs: isValidBall && currentBallInOver === 6 ? prev.overs + 1 : prev.overs,
      balls: isValidBall ? (currentBallInOver === 6 ? 0 : prev.balls + 1) : prev.balls
    }));
    
    // Handle striker rotation
    if (isValidBall && (entry.runs % 2 === 1)) {
      // Odd runs - swap batsmen
      const temp = striker;
      setStriker(nonStriker);
      setNonStriker(temp);
    }
    
    // Handle over completion
    if (isValidBall) {
      if (currentBallInOver === 6) {
        // Over complete - swap batsmen and reset
        const temp = striker;
        setStriker(nonStriker);
        setNonStriker(temp);
        setCurrentOver(prev => prev + 1);
        setCurrentBallInOver(1);
        setBallPosition(1);
        setOverBalls([]);
        setNeedsBowlerChange(true);
      } else {
        setCurrentBallInOver(prev => prev + 1);
      }
    }
    
    // Handle wicket
    if (entry.isWicket) {
      setNeedsBatsmanChange(true);
      setShowWicketModal(true);
      // Clear pending wicket details after ball is recorded
      setPendingWicketDetails(null);
    }
  };

  // Quick entry buttons with proper color coding
  const quickEntryButtons = [
    { label: "0", entry: { runs: 0, isWide: false, isNoBall: false, isWicket: false, extras: 0 }, color: "bg-slate-500 hover:bg-slate-600" },
    { label: "1", entry: { runs: 1, isWide: false, isNoBall: false, isWicket: false, extras: 0 }, color: "bg-blue-500 hover:bg-blue-600" },
    { label: "2", entry: { runs: 2, isWide: false, isNoBall: false, isWicket: false, extras: 0 }, color: "bg-blue-500 hover:bg-blue-600" },
    { label: "3", entry: { runs: 3, isWide: false, isNoBall: false, isWicket: false, extras: 0 }, color: "bg-blue-500 hover:bg-blue-600" },
    { label: "4", entry: { runs: 4, isWide: false, isNoBall: false, isWicket: false, extras: 0 }, color: "bg-green-500 hover:bg-green-600" },
    { label: "5", entry: { runs: 5, isWide: false, isNoBall: false, isWicket: false, extras: 0 }, color: "bg-blue-500 hover:bg-blue-600" },
    { label: "6", entry: { runs: 6, isWide: false, isNoBall: false, isWicket: false, extras: 0 }, color: "bg-green-500 hover:bg-green-600" },
    { label: "W", entry: { runs: 0, isWide: false, isNoBall: false, isWicket: true, extras: 0 }, color: "bg-red-500 hover:bg-red-600" },
    { label: "Wd", entry: { runs: 0, isWide: true, isNoBall: false, isWicket: false, extras: 1 }, color: "bg-orange-500 hover:bg-orange-600" },
    { label: "NB", entry: { runs: 0, isWide: false, isNoBall: true, isWicket: false, extras: 1 }, color: "bg-orange-500 hover:bg-orange-600" },
  ];

  // Handle custom entry submission
  const handleCustomEntry = () => {
    const entry: BallEntry = {
      runs: customEntry.runs,
      isWide: customEntry.isWide,
      isNoBall: customEntry.isNoBall,
      isWicket: customEntry.isWicket,
      extras: customEntry.isWide || customEntry.isNoBall ? 1 : 0
    };
    
    handleBallEntry(entry);
    
    // Reset custom entry
    setCustomEntry({
      runs: 0,
      isWide: false,
      isNoBall: false,
      isWicket: false,
      isBye: false,
      isLegBye: false,
      extras: 0
    });
  };

  return (
    <div className="space-y-6">
      {/* Match Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="text-2xl font-bold">
              {match.battingTeam.name} vs {match.bowlingTeam.name}
            </span>
            <Badge variant="outline" className="text-lg px-4 py-2">
              Innings {currentInnings}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {totalScore.runs}/{totalScore.wickets}
              </div>
              <div className="text-sm text-muted-foreground">Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {totalScore.overs}.{totalScore.balls}
              </div>
              <div className="text-sm text-muted-foreground">Overs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {runRate.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">Run Rate</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">
                Over {currentOver}
              </div>
              <div className="text-sm text-muted-foreground">Current</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Players */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Current Players
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Batsmen side by side */}
            <div className="md:col-span-2 grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Striker *
                </Label>
                <Select value={striker?.id.toString()} onValueChange={(value) => {
                  const player = battingPlayers.find(p => p.id === parseInt(value));
                  if (player) setStriker(player);
                }}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {battingPlayers
                      .filter(player => player.id !== nonStriker?.id && player.id !== bowler?.id)
                      .map((player) => (
                        <SelectItem key={player.id} value={player.id.toString()}>
                          {player.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Non-Striker
                </Label>
                <Select value={nonStriker?.id.toString()} onValueChange={(value) => {
                  const player = battingPlayers.find(p => p.id === parseInt(value));
                  if (player) setNonStriker(player);
                }}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {battingPlayers
                      .filter(player => player.id !== striker?.id && player.id !== bowler?.id)
                      .map((player) => (
                        <SelectItem key={player.id} value={player.id.toString()}>
                          {player.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Bowler */}
            <div>
              <Label className="text-sm font-medium flex items-center gap-2">
                <Circle className="h-4 w-4" />
                Bowler
              </Label>
              <Select value={bowler?.id.toString()} onValueChange={(value) => {
                const player = bowlingPlayers.find(p => p.id === parseInt(value));
                if (player) setBowler(player);
              }}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {bowlingPlayers
                    .filter(player => player.id !== striker?.id && player.id !== nonStriker?.id)
                    .map((player) => (
                      <SelectItem key={player.id} value={player.id.toString()}>
                        {player.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scoring Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Ball-by-Ball Scoring</span>
            <div className="flex gap-2">
              <Button
                variant={quickEntryMode ? "default" : "outline"}
                size="sm"
                onClick={() => setQuickEntryMode(true)}
              >
                Quick Entry
              </Button>
              <Button
                variant={!quickEntryMode ? "default" : "outline"}
                size="sm"
                onClick={() => setQuickEntryMode(false)}
              >
                Custom Entry
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {quickEntryMode ? (
            <div className="grid grid-cols-5 gap-2">
              {quickEntryButtons.map((button) => (
                <Button
                  key={button.label}
                  className={`h-12 text-white font-bold ${button.color}`}
                  onClick={() => handleBallEntry(button.entry)}
                >
                  {button.label}
                </Button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="runs">Runs</Label>
                  <Input
                    id="runs"
                    type="number"
                    min="0"
                    value={customEntry.runs}
                    onChange={(e) => setCustomEntry(prev => ({ ...prev, runs: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="extras">Extras</Label>
                  <Input
                    id="extras"
                    type="number"
                    min="0"
                    value={customEntry.extras}
                    onChange={(e) => setCustomEntry(prev => ({ ...prev, extras: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="wide"
                    checked={customEntry.isWide}
                    onCheckedChange={(checked) => setCustomEntry(prev => ({ ...prev, isWide: checked as boolean }))}
                  />
                  <Label htmlFor="wide">Wide</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="noball"
                    checked={customEntry.isNoBall}
                    onCheckedChange={(checked) => setCustomEntry(prev => ({ ...prev, isNoBall: checked as boolean }))}
                  />
                  <Label htmlFor="noball">No Ball</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="wicket"
                    checked={customEntry.isWicket}
                    onCheckedChange={(checked) => setCustomEntry(prev => ({ ...prev, isWicket: checked as boolean }))}
                  />
                  <Label htmlFor="wicket">Wicket</Label>
                </div>
              </div>
              <Button onClick={handleCustomEntry} className="w-full">
                Add Ball
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Over Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Current Over Progress</span>
            <div className="flex gap-2">
              {needsBowlerChange && (
                <Badge variant="destructive" className="animate-pulse">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Change Bowler
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-4 w-4 p-0 ml-1 text-white hover:text-white"
                    onClick={() => setNeedsBowlerChange(false)}
                  >
                    ×
                  </Button>
                </Badge>
              )}
              {needsBatsmanChange && (
                <Badge variant="destructive" className="animate-pulse">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  New Batsman
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-4 w-4 p-0 ml-1 text-white hover:text-white"
                    onClick={() => setNeedsBatsmanChange(false)}
                  >
                    ×
                  </Button>
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Valid balls row */}
            <div>
              <div className="text-xs text-muted-foreground mb-2">Valid Balls</div>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6].map((ballNum) => {
                  const ball = overBalls.find(b => b.ballNumber === ballNum);
                  return (
                    <div
                      key={ballNum}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        ball
                          ? ball.entry.isWicket
                            ? 'bg-red-500 text-white'
                            : ball.entry.runs === 4 || ball.entry.runs === 6
                            ? 'bg-green-500 text-white'
                            : 'bg-blue-500 text-white'
                          : ballNum === currentBallInOver
                          ? 'bg-blue-100 border-2 border-blue-500'
                          : 'bg-gray-200'
                      }`}
                    >
                      {ball ? (ball.entry.isWicket ? 'W' : ball.entry.runs) : ballNum}
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Extras row if any */}
            {overBalls.some(b => b.ballNumber === 0) && (
              <div>
                <div className="text-xs text-muted-foreground mb-2">Extras</div>
                <div className="flex gap-2 flex-wrap">
                  {overBalls.filter(b => b.ballNumber === 0).map((ball, index) => (
                    <div
                      key={index}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-orange-500 text-white"
                    >
                      {ball.entry.isWide ? 'Wd' : ball.entry.isNoBall ? 'NB' : 'E'}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="text-sm text-muted-foreground">
              Ball {currentBallInOver} of 6 | Over {currentOver}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Match Commentary */}
      <Card>
        <CardHeader>
          <CardTitle>Live Commentary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {allBalls.slice(-10).reverse().map((ball, index) => {
              const overDisplay = ball.overNumber === 1 ? 0 : ball.overNumber - 1;
              const ballDisplay = ball.ballNumber || 'Extra';
              return (
                <div key={index} className="text-sm border-b pb-2">
                  <div className="font-medium">
                    {overDisplay}.{ballDisplay} - {ball.commentary}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {ball.striker} * {ball.nonStriker} | {ball.bowler} bowling
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Wicket Details Modal */}
      <WicketDetailsModal
        isOpen={showWicketModal}
        onClose={() => setShowWicketModal(false)}
        match={match}
        onWicketSubmit={handleWicketDetails}
      />
    </div>
  );
}