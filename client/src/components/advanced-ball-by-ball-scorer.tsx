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
  User, Circle, Info
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
  const [singleBattingMode, setSingleBattingMode] = useState(false);
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

  // Get available fielders (all bowling team players + common players)
  const getAvailableFielders = () => {
    const commonPlayers = match.commonPlayers || [];
    const allFielders = [...bowlingTeamPlayers, ...commonPlayers];
    
    // Remove duplicates and unavailable players
    return allFielders.filter((player, index, arr) => 
      arr.findIndex(p => p.id === player.id) === index &&
      !match.unavailablePlayers?.includes(player.id)
    );
  };

  // Use the filtered lists
  const battingPlayers = getAvailableBattingPlayers();
  const bowlingPlayers = getAvailableBowlingPlayers();
  const fielders = getAvailableFielders();

  // Check if we're in single batting mode
  const checkSingleBattingMode = () => {
    const availableBatters = getAvailableBattingPlayers();
    const isSingleBatting = availableBatters.length === 1;
    setSingleBattingMode(isSingleBatting);
    return isSingleBatting;
  };

  // Initialize single batting mode check
  useEffect(() => {
    checkSingleBattingMode();
  }, [dismissedPlayers, battingPlayers]);

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
    
    // Handle striker rotation - only if not in single batting mode
    if (isValidBall && (entry.runs % 2 === 1) && !singleBattingMode) {
      // Odd runs - swap batsmen (only if not single batting)
      const temp = striker;
      setStriker(nonStriker);
      setNonStriker(temp);
    }
    
    // Handle over completion and ball progression
    if (isValidBall) {
      if (currentBallInOver === 6) {
        // Over complete - swap batsmen and reset (only if not single batting)
        if (!singleBattingMode) {
          const temp = striker;
          setStriker(nonStriker);
          setNonStriker(temp);
        }
        setCurrentOver(prev => prev + 1);
        setCurrentBallInOver(1);
        setBallPosition(1);
        setOverBalls([]);
        // Block all ball entry until bowler is changed
        setNeedsBowlerChange(true);
      } else {
        setCurrentBallInOver(prev => prev + 1);
      }
    }
    // For extras, don't increment currentBallInOver - stay on same ball
    
    // Handle wicket
    if (entry.isWicket) {
      // Block all further ball entry until new batter is selected
      setNeedsBatsmanChange(true);
      setShowWicketModal(true);
      // Clear pending wicket details after ball is recorded
      setPendingWicketDetails(null);
      
      // Check single batting mode after wicket
      checkSingleBattingMode();
      
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

      {/* Bowler Change Alert - Right after Current Players for visibility */}
      {needsBowlerChange && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Over completed! Please select a new bowler</span>
              </div>
              <Button
                onClick={() => setNeedsBowlerChange(false)}
                variant="outline"
                size="sm"
                className="bg-green-600 text-white hover:bg-green-700 border-green-600"
              >
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Batsman Alert - Right after Current Players for visibility */}
      {needsBatsmanChange && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Wicket taken! Please select a new batsman</span>
              </div>
              <Button
                onClick={() => setNeedsBatsmanChange(false)}
                variant="outline"
                size="sm"
                className="bg-green-600 text-white hover:bg-green-700 border-green-600"
              >
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Indicators */}
      {(needsBowlerChange || needsBatsmanChange) && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">
                {needsBowlerChange && "Bowler change required after over completion"}
                {needsBatsmanChange && "New batter selection required after wicket"}
                {needsBowlerChange && needsBatsmanChange && "Bowler and batter changes required"}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {singleBattingMode && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Info className="h-5 w-5" />
              <span className="font-medium">Single Batting Mode: Remaining batter always on strike</span>
            </div>
          </CardContent>
        </Card>
      )}

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
                    disabled={needsBowlerChange || needsBatsmanChange}
                    onClick={() => {
                      if (needsBowlerChange || needsBatsmanChange) return;
                      handleBallEntry(button.entry);
                    }}
                  >
                    {button.label}
                  </Button>
                ))}
              </div>
              <div className="flex gap-4 justify-center">
                <Button
                  className="h-12 px-6 text-white font-bold bg-orange-500 hover:bg-orange-600"
                  disabled={needsBowlerChange || needsBatsmanChange}
                  onClick={() => {
                    if (needsBowlerChange || needsBatsmanChange) return;
                    setShowNoBallOptions(true);
                  }}
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
              <Button 
                onClick={() => {
                  if (needsBowlerChange || needsBatsmanChange) return;
                  handleCustomEntry();
                }}
                disabled={needsBowlerChange || needsBatsmanChange}
                className="w-full"
              >
                Add Ball
              </Button>
            </div>
          )}
        </CardContent>
      </Card>



      {/* Current Over Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Current Over Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Over Progress - Tennis Ball Display */}
            <div>
              <div className="text-xs text-muted-foreground mb-2">Over Progress</div>
              <div className="flex gap-3 flex-wrap">
                {(() => {
                  // Create a display array starting with all balls chronologically
                  const displayBalls = [...overBalls];
                  
                  // Count valid balls (non-extras)
                  const validBallsCount = overBalls.filter(b => !b.entry.isWide && !b.entry.isNoBall).length;
                  
                  // Add empty slots to make total legitimate ball positions = 6
                  const emptySlots = Math.max(0, 6 - validBallsCount);
                  for (let i = 0; i < emptySlots; i++) {
                    displayBalls.push(null); // null represents empty slot
                  }
                  
                  return displayBalls.map((ball, index) => {
                    if (!ball) {
                      // Empty slot
                      const isNextBall = index === overBalls.length; // First empty slot is next ball
                      return (
                        <div key={`empty-${index}`} className="flex flex-col items-center gap-1">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg relative ${
                            isNextBall 
                              ? 'bg-yellow-300 border-3 border-yellow-500 animate-pulse'
                              : 'bg-gray-200 border-2 border-gray-300'
                          }`}>
                            {/* Tennis ball texture lines */}
                            <div className="absolute inset-0 rounded-full">
                              <div className="w-full h-0.5 bg-white/30 absolute top-1/2 transform -translate-y-0.5 rotate-12"></div>
                              <div className="w-full h-0.5 bg-white/30 absolute top-1/2 transform -translate-y-0.5 -rotate-12"></div>
                            </div>
                          </div>
                          {isNextBall && (
                            <div className="text-xs font-medium px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                              Next Ball
                            </div>
                          )}
                        </div>
                      );
                    }
                    
                    // Filled ball
                    const isExtra = ball.entry.isWide || ball.entry.isNoBall;
                    const displayText = isExtra 
                      ? ball.entry.isWide 
                        ? 'WD' 
                        : ball.entry.isNoBall 
                          ? `NB${ball.entry.runs > 0 ? `+${ball.entry.runs}` : ''}`
                          : 'E'
                      : ball.entry.isWicket 
                        ? 'W' 
                        : ball.entry.runs.toString();
                    
                    return (
                      <div key={index} className="flex flex-col items-center gap-1">
                        {/* Tennis Ball Icon */}
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-lg relative ${
                            isExtra
                              ? 'bg-orange-500 text-white shadow-lg' // Extras - Orange
                              : ball.entry.isWicket
                              ? 'bg-red-500 text-white shadow-lg' // Wicket - Red
                              : ball.entry.runs === 4 || ball.entry.runs === 6
                              ? 'bg-green-500 text-white shadow-lg' // Boundary - Green
                              : ball.entry.runs === 0
                              ? 'bg-gray-500 text-white shadow-lg' // Dot ball - Gray
                              : 'bg-blue-500 text-white shadow-lg' // Regular runs - Blue
                          }`}
                        >
                          {/* Tennis ball texture lines */}
                          <div className="absolute inset-0 rounded-full">
                            <div className="w-full h-0.5 bg-white/30 absolute top-1/2 transform -translate-y-0.5 rotate-12"></div>
                            <div className="w-full h-0.5 bg-white/30 absolute top-1/2 transform -translate-y-0.5 -rotate-12"></div>
                          </div>
                          {/* Ball content */}
                          <span className="relative z-10 font-bold text-xs">
                            {displayText}
                          </span>
                        </div>
                        
                        {/* Runs display below ball */}
                        <div className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                          isExtra
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                            : ball.entry.isWicket
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                            : ball.entry.runs === 4 || ball.entry.runs === 6
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                            : ball.entry.runs === 0
                            ? 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        }`}>
                          {isExtra 
                            ? ball.entry.isWide 
                              ? 'WIDE' 
                              : 'NO BALL'
                            : ball.entry.isWicket 
                              ? 'WICKET' 
                              : `${ball.entry.runs} run${ball.entry.runs !== 1 ? 's' : ''}`
                          }
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Color Legend */}
            <div>
              <div className="text-xs text-muted-foreground mb-2">Legend</div>
              <div className="flex flex-wrap gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded-full bg-yellow-300 border border-yellow-500"></div>
                  <span>Next Ball</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                  <span>Runs</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded-full bg-green-500"></div>
                  <span>Boundary</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded-full bg-gray-500"></div>
                  <span>Dot Ball</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded-full bg-red-500"></div>
                  <span>Wicket</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                  <span>Extra (WD/NB)</span>
                </div>
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
              // Format ball number correctly - remove the leading "0." for display
              const ballDisplay = ball.ballNumber ? ball.ballNumber.toString().replace('0.', '') : 'Extra';
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