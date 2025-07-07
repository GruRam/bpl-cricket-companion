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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
    runsScored?: number;
  }) => void;
}

interface CompletedBall {
  ballNumber: number; // 1-6 for valid balls, 0.1, 0.2, etc. for extras
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
 // Count of extra balls in current over
  const [needsBowlerChange, setNeedsBowlerChange] = useState(false);
  const [needsBatsmanChange, setNeedsBatsmanChange] = useState(false);
  const [pendingWicketDetails, setPendingWicketDetails] = useState<{
    batsmanOut: string;
    dismissalType: string;
    fielder?: string;
    runsScored?: number;
  } | null>(null);
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [dismissedPlayers, setDismissedPlayers] = useState<number[]>([]);
  
  // UI state
  const [quickEntryMode, setQuickEntryMode] = useState(true);
  const [showNoBallOptions, setShowNoBallOptions] = useState(false);
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
  const { data: battingTeamPlayers = [] } = useQuery<Player[]>({
    queryKey: ["/api/teams", match.battingTeam.id, "players"],
    select: (data: any) => data.map((tp: any) => tp.player).sort((a: Player, b: Player) => a.name.localeCompare(b.name)),
  });

  const { data: bowlingTeamPlayers = [] } = useQuery<Player[]>({
    queryKey: ["/api/teams", match.bowlingTeam.id, "players"],
    select: (data: any) => data.map((tp: any) => tp.player).sort((a: Player, b: Player) => a.name.localeCompare(b.name)),
  });

  // Get available players for batting (batting team + common players, minus bowler if common)
  const getAvailableBattingPlayers = () => {
    const commonPlayers = match.commonPlayers || [];
    const allBattingPlayers = [...battingTeamPlayers, ...commonPlayers];
    
    // Remove duplicates and unavailable players
    const uniquePlayers = allBattingPlayers.filter((player, index, arr) => 
      arr.findIndex(p => p.id === player.id) === index &&
      !match.unavailablePlayers?.includes(player.id) &&
      !dismissedPlayers.includes(player.id)
    );

    // If current bowler is a common player, exclude them from batting
    const currentBowlerId = bowler?.id;
    const isCurrentBowlerCommon = commonPlayers.some(cp => cp.id === currentBowlerId);
    
    if (isCurrentBowlerCommon) {
      return uniquePlayers.filter(p => p.id !== currentBowlerId);
    }
    
    return uniquePlayers;
  };

  // Get available players for bowling (bowling team + common players, minus current batsmen if common)
  const getAvailableBowlingPlayers = () => {
    const commonPlayers = match.commonPlayers || [];
    const allBowlingPlayers = [...bowlingTeamPlayers, ...commonPlayers];
    
    // Remove duplicates and unavailable players
    const uniquePlayers = allBowlingPlayers.filter((player, index, arr) => 
      arr.findIndex(p => p.id === player.id) === index &&
      !match.unavailablePlayers?.includes(player.id)
    );

    // If current batsmen are common players, exclude them from bowling
    const currentBatsmenIds = [striker?.id, nonStriker?.id].filter(Boolean);
    const areBatsmenCommon = currentBatsmenIds.some(id => 
      commonPlayers.some(cp => cp.id === id)
    );
    
    if (areBatsmenCommon) {
      return uniquePlayers.filter(p => !currentBatsmenIds.includes(p.id));
    }
    
    return uniquePlayers;
  };

  // Use the filtered lists
  const battingPlayers = getAvailableBattingPlayers();
  const bowlingPlayers = getAvailableBowlingPlayers();

  // Check if bowler change is needed for common player scenario
  const checkBowlerChangeForCommonPlayer = () => {
    const commonPlayers = match.commonPlayers || [];
    const currentBowlerId = bowler?.id;
    
    // Check if current bowler is a common player
    const isCurrentBowlerCommon = commonPlayers.some(cp => cp.id === currentBowlerId);
    
    if (isCurrentBowlerCommon) {
      // Check if only common players are left for batting
      const availableBatters = getAvailableBattingPlayers();
      const isOnlyCommonPlayerLeft = availableBatters.length === 1 && 
        availableBatters[0].id === currentBowlerId;
      
      if (isOnlyCommonPlayerLeft) {
        // Force bowler change - set needs bowler change
        setNeedsBowlerChange(true);
        // Auto-set common player as next batsman
        // This will be handled in the wicket modal
      }
    }
  };

  // Calculate run rate
  useEffect(() => {
    const totalBalls = (totalScore.overs * 6) + totalScore.balls;
    if (totalBalls > 0) {
      setRunRate((totalScore.runs / totalBalls) * 6);
    }
  }, [totalScore]);

  // Save match state to localStorage
  useEffect(() => {
    const matchState = {
      striker,
      nonStriker,
      bowler,
      totalScore,
      currentOver,
      currentBallInOver,
      overBalls,
      allBalls,
      dismissedPlayers,
      ballPosition,
      runRate
    };
    localStorage.setItem(`match_${match.id}`, JSON.stringify(matchState));
  }, [striker, nonStriker, bowler, totalScore, currentOver, currentBallInOver, overBalls, allBalls, dismissedPlayers, ballPosition, runRate, match.id]);

  // Load match state from localStorage on component mount
  useEffect(() => {
    const savedState = localStorage.getItem(`match_${match.id}`);
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        setStriker(state.striker || match.striker);
        setNonStriker(state.nonStriker || match.nonStriker);
        setBowler(state.bowler || match.bowler);
        setTotalScore(state.totalScore || { runs: 0, wickets: 0, overs: 0, balls: 0 });
        setCurrentOver(state.currentOver || 1);
        setCurrentBallInOver(state.currentBallInOver || 1);
        setOverBalls(state.overBalls || []);
        setAllBalls(state.allBalls || []);
        setDismissedPlayers(state.dismissedPlayers || []);
        setBallPosition(state.ballPosition || 1);
        setRunRate(state.runRate || 0);

      } catch (error) {
        console.error('Error loading match state:', error);
      }
    }
  }, [match.id]);

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
        const batsmanOut = wicketDetails.batsmanOut === 'striker' ? striker?.name || 'Unknown' : nonStriker?.name || 'Unknown';
        commentary += ` - OUT! ${batsmanOut} ${dismissalType}`;
        if (wicketDetails.fielder) {
          const fielderPlayer = bowlingPlayers.find(p => p.id.toString() === wicketDetails.fielder);
          if (fielderPlayer) {
            commentary += ` (by ${fielderPlayer.name})`;
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
    runsScored?: number;
  }) => {
    setPendingWicketDetails(wicketDetails);
    
    // Add dismissed player to list
    const dismissedPlayerId = wicketDetails.batsmanOut === 'striker' ? striker?.id : nonStriker?.id;
    if (dismissedPlayerId) {
      setDismissedPlayers(prev => [...prev, dismissedPlayerId]);
    }
    
    // For run outs with runs, create a ball entry with the runs scored
    if (wicketDetails.dismissalType === "Run Out" && wicketDetails.runsScored !== undefined) {
      const entry: BallEntry = {
        runs: wicketDetails.runsScored,
        isWide: false,
        isNoBall: false,
        isWicket: true,
        extras: 0
      };
      
      // Process the ball with runs and wicket
      handleBallEntry(entry);
    }
    
    if (onWicketDetails) {
      onWicketDetails(wicketDetails);
    }
  };

  // Handle ball entry
  const handleBallEntry = (entry: BallEntry) => {
    const isValidBall = !entry.isWide && !entry.isNoBall;
    const totalRuns = entry.runs + entry.extras;
    
    // Calculate ball number for commentary using decimal notation
    let ballNumber: number;
    if (isValidBall) {
      ballNumber = parseFloat(`0.${currentBallInOver}`);
    } else {
      // For extras, keep using the same ball number as the current ball
      ballNumber = parseFloat(`0.${currentBallInOver}`);
    }
    
    // Create completed ball record
    const completedBall: CompletedBall = {
      ballNumber,
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
    
    // Handle over completion and ball progression
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
    // For extras, don't increment currentBallInOver - stay on same ball
    
    // Handle wicket
    if (entry.isWicket) {
      setNeedsBatsmanChange(true);
      setShowWicketModal(true);
      // Clear pending wicket details after ball is recorded
      setPendingWicketDetails(null);
      
      // Check if bowler needs to change due to common player scenario
      checkBowlerChangeForCommonPlayer();
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
    { label: "WD", entry: { runs: 0, isWide: true, isNoBall: false, isWicket: false, extras: 1 }, color: "bg-orange-500 hover:bg-orange-600" },
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
            {/* Batsmen with swap functionality */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Striker *
                  </Label>
                  <Select value={striker?.id ? striker.id.toString() : ""} onValueChange={(value) => {
                    const player = battingPlayers.find(p => p.id === parseInt(value));
                    if (player) setStriker(player);
                  }}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select striker" />
                    </SelectTrigger>
                    <SelectContent>
                      {battingPlayers
                        .filter(player => 
                          player.id !== nonStriker?.id && 
                          player.id !== bowler?.id &&
                          !dismissedPlayers.includes(player.id) &&
                          !match.unavailablePlayers?.includes(player.id)
                        )
                        .map((player) => (
                          <SelectItem key={player.id} value={player.id.toString()}>
                            {player.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex flex-col items-center justify-center mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const temp = striker;
                      setStriker(nonStriker);
                      setNonStriker(temp);
                    }}
                    disabled={!striker || !nonStriker}
                    className="h-8 w-16"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground mt-1">Swap</span>
                </div>
                
                <div className="flex-1">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Non-Striker
                  </Label>
                  <Select value={nonStriker?.id ? nonStriker.id.toString() : ""} onValueChange={(value) => {
                    const player = battingPlayers.find(p => p.id === parseInt(value));
                    if (player) setNonStriker(player);
                  }}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select non-striker" />
                    </SelectTrigger>
                    <SelectContent>
                      {battingPlayers
                        .filter(player => 
                          player.id !== striker?.id && 
                          player.id !== bowler?.id &&
                          !dismissedPlayers.includes(player.id) &&
                          !match.unavailablePlayers?.includes(player.id)
                        )
                        .map((player) => (
                          <SelectItem key={player.id} value={player.id.toString()}>
                            {player.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            {/* Bowler */}
            <div>
              <Label className="text-sm font-medium flex items-center gap-2">
                <Circle className="h-4 w-4" />
                Bowler
              </Label>
              <Select value={bowler?.id ? bowler.id.toString() : ""} onValueChange={(value) => {
                const player = bowlingPlayers.find(p => p.id === parseInt(value));
                if (player) setBowler(player);
              }}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select bowler" />
                </SelectTrigger>
                <SelectContent>
                  {bowlingPlayers
                    .filter(player => 
                      player.id !== striker?.id && 
                      player.id !== nonStriker?.id &&
                      !match.unavailablePlayers?.includes(player.id)
                    )
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
            <div className="space-y-4">
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
              <div className="flex gap-4 justify-center">
                <Button
                  className="h-12 px-6 text-white font-bold bg-orange-500 hover:bg-orange-600"
                  onClick={() => setShowNoBallOptions(true)}
                >
                  NB
                </Button>
              </div>
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
                  // Find the last valid ball for this position
                  const ballsForPosition = overBalls.filter(b => {
                    const ballPos = parseFloat(b.ballNumber.toString());
                    return Math.abs(ballPos - parseFloat(`0.${ballNum}`)) < 0.001;
                  });
                  const ball = ballsForPosition[ballsForPosition.length - 1]; // Get the last ball for this position
                  
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
            
            {/* Live Commentary */}
            <div>
              <div className="text-xs text-muted-foreground mb-2">Live Commentary</div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {overBalls.map((ball, index) => (
                  <div key={index} className="text-sm">
                    <span className="font-bold">{ball.ballNumber}:</span> {ball.commentary}
                  </div>
                ))}
              </div>
            </div>
            
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
        currentStriker={striker?.id ? { 
          id: striker.id, 
          name: striker.name, 
          isActive: null, 
          createdAt: null 
        } : undefined}
        currentNonStriker={nonStriker?.id ? { 
          id: nonStriker.id, 
          name: nonStriker.name, 
          isActive: null, 
          createdAt: null 
        } : undefined}
        onWicketSubmit={handleWicketDetails}
      />
      
      <Dialog open={showNoBallOptions} onOpenChange={setShowNoBallOptions}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No Ball Options</DialogTitle>
            <DialogDescription>
              Select additional runs scored by batters (on top of the 1 no-ball extra)
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-2 mt-4">
            {[0, 1, 2, 3, 4, 5, 6].map(runs => (
              <Button
                key={runs}
                variant="outline"
                className="h-12 text-lg font-bold"
                onClick={() => {
                  handleBallEntry({ runs, isWide: false, isNoBall: true, isWicket: false, extras: 1 });
                  setShowNoBallOptions(false);
                }}
              >
                {runs}
              </Button>
            ))}
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p>Note: On a no-ball, batters can also be run out.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}