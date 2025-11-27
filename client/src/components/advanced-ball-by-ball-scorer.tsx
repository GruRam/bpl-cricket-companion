import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
  User, Circle, Info, CheckCircle
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { CurrentMatch, BallEntry, SavedMatchState } from "@/lib/types";
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
  savedState?: SavedMatchState;
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
  innings: number; // Track which innings this ball belongs to
}

export default function AdvancedBallByBallScorer({ match, onWicketClick, onWicketDetails, savedState }: BallByBallScorerProps) {
  // Match state - initialize from saved state or defaults
  const [currentInnings, setCurrentInnings] = useState(savedState?.currentInnings || 1);
  const [striker, setStriker] = useState(savedState?.striker || match.striker);
  const [nonStriker, setNonStriker] = useState(savedState?.nonStriker || match.nonStriker);
  const [bowler, setBowler] = useState(savedState?.bowler || match.bowler);
  const [totalScore, setTotalScore] = useState(savedState?.totalScore || { runs: 0, wickets: 0, overs: 0, balls: 0 });
  const [runRate, setRunRate] = useState(savedState?.runRate || 0);
  
  // Current over state
  const [currentOver, setCurrentOver] = useState(savedState?.currentOver || 1);
  const [currentBallInOver, setCurrentBallInOver] = useState(savedState?.currentBallInOver || 1);
  const [overBalls, setOverBalls] = useState<CompletedBall[]>(savedState?.overBalls || []);
  const [allBalls, setAllBalls] = useState<CompletedBall[]>(savedState?.allBalls || []);
  const [firstInningsBalls, setFirstInningsBalls] = useState<CompletedBall[]>(savedState?.firstInningsBalls || []);
  const [ballPosition, setBallPosition] = useState(savedState?.ballPosition || 1); // Position in over for display
  const [previousBowler, setPreviousBowler] = useState(savedState?.previousBowler || null);
  const [needsBowlerChange, setNeedsBowlerChange] = useState(savedState?.needsBowlerChange || false);
  const [needsBatsmanChange, setNeedsBatsmanChange] = useState(savedState?.needsBatsmanChange || false);
  const [needsInningsSetup, setNeedsInningsSetup] = useState(savedState?.needsInningsSetup || false);
  const [singleBattingMode, setSingleBattingMode] = useState(savedState?.singleBattingMode || false);
  const [isInningsComplete, setIsInningsComplete] = useState(savedState?.isInningsComplete || false);
  const [isMatchComplete, setIsMatchComplete] = useState(savedState?.isMatchComplete || false);
  const [matchWinner, setMatchWinner] = useState<{ teamName: string; margin: string } | null>(savedState?.matchWinner || null);
  const [showInningsBreak, setShowInningsBreak] = useState(savedState?.showInningsBreak || false);
  const [firstInningsScore, setFirstInningsScore] = useState<{ runs: number; wickets: number; overs: number; balls: number } | null>(savedState?.firstInningsScore || null);
  const [pendingWicketDetails, setPendingWicketDetails] = useState<{
    batsmanOut: string;
    dismissalType: string;
    fielder?: string;
    runsScored?: number;
  } | null>(null);
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [dismissedPlayers, setDismissedPlayers] = useState<number[]>(savedState?.dismissedPlayers || []);
  
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
  
  // Auto-save match state function
  const saveMatchState = () => {
    // Don't save if match is complete
    if (isMatchComplete) {
      localStorage.removeItem(`match_${match.id}`);
      return;
    }
    
    const currentState: SavedMatchState = {
      match,
      currentInnings,
      currentOver,
      currentBallInOver,
      ballPosition,
      totalScore,
      runRate,
      striker,
      nonStriker,
      bowler,
      previousBowler,
      dismissedPlayers,
      isInningsComplete,
      isMatchComplete,
      matchWinner,
      showInningsBreak,
      firstInningsScore,
      allBalls,
      firstInningsBalls,
      overBalls,
      needsBowlerChange,
      needsBatsmanChange,
      needsInningsSetup,
      singleBattingMode,
      savedAt: new Date().toISOString()
    };
    
    localStorage.setItem(`match_${match.id}`, JSON.stringify(currentState));
  };

  // Clear saved state when match is complete
  const clearSavedState = () => {
    localStorage.removeItem(`match_${match.id}`);
  };

  // Auto-save after every ball entry
  useEffect(() => {
    if (allBalls.length > 0) {
      saveMatchState();
    }
  }, [allBalls, totalScore, currentOver, currentInnings, striker, nonStriker, bowler, dismissedPlayers, isInningsComplete, isMatchComplete]);

  // Get active series for stats updates
  const { data: activeSeries } = useQuery({
    queryKey: ["/api/series/active"],
  });

  // Mutation for updating player stats
  const saveBallMutation = useMutation({
    mutationFn: async (ballData: {
      matchId: number;
      seriesId: number;
      inningsNumber: number;
      overNumber: number;
      ballNumber: number;
      strikerId: number;
      nonStrikerId: number;
      bowlerId: number;
      runs: number;
      isWide: boolean;
      isNoBall: boolean;
      isWicket: boolean;
      wicketType?: string;
      wicketPlayerId?: number;
      fielderId?: number;
      extras: number;
      battingTeamId: number;
      bowlingTeamId: number;
    }) => {
      const response = await apiRequest("POST", "/api/balls/save-with-context", ballData);
      return await response.json();
    },
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
      runRate,
      unavailablePlayers: match.unavailablePlayers,
      commonPlayers: match.commonPlayers,
      oversPerSide: match.oversPerSide
    };
    localStorage.setItem(`match_${match.id}`, JSON.stringify(matchState));
  }, [striker, nonStriker, bowler, totalScore, currentOver, currentBallInOver, overBalls, allBalls, dismissedPlayers, ballPosition, runRate, match.id, match.unavailablePlayers, match.commonPlayers, match.oversPerSide]);

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
    
    // Create a ball entry for the wicket
    const entry: BallEntry = {
      runs: wicketDetails.runsScored || 0, // Use runs scored if provided (run outs), otherwise 0
      isWide: false,
      isNoBall: false,
      isWicket: true,
      extras: 0
    };
    
    // Process the ball with wicket
    handleBallEntry(entry);
    
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
      commentary: generateCommentary(entry, striker.name, bowler.name),
      innings: currentInnings
    };
    
    // Add to balls arrays
    setOverBalls(prev => [...prev, completedBall]);
    setAllBalls(prev => [...prev, completedBall]);
    
    // Update ball position for display
    setBallPosition(prev => prev + 1);
    
    // Save ball to database with auto-creation of innings/overs
    if (activeSeries?.id) {
      saveBallMutation.mutate({
        matchId: match.id,
        seriesId: activeSeries.id,
        inningsNumber: currentInnings,
        overNumber: currentOver,
        ballNumber: currentBallInOver,
        strikerId: striker.id,
        nonStrikerId: nonStriker.id,
        bowlerId: bowler.id,
        runs: entry.runs,
        isWide: entry.isWide,
        isNoBall: entry.isNoBall,
        isWicket: entry.isWicket,
        wicketType: entry.isWicket ? pendingWicketDetails?.dismissalType : undefined,
        wicketPlayerId: entry.isWicket ? (pendingWicketDetails?.batsmanOut === 'striker' ? striker.id : nonStriker.id) : undefined,
        fielderId: pendingWicketDetails?.fielder ? parseInt(pendingWicketDetails.fielder) : undefined,
        extras: entry.extras,
        battingTeamId: match.battingTeam.id,
        bowlingTeamId: match.bowlingTeam.id,
      });
    }
    
    // Update total score
    const newScore = {
      runs: totalScore.runs + totalRuns,
      wickets: entry.isWicket ? totalScore.wickets + 1 : totalScore.wickets,
      overs: isValidBall && currentBallInOver === 6 ? totalScore.overs + 1 : totalScore.overs,
      balls: isValidBall ? (currentBallInOver === 6 ? 0 : totalScore.balls + 1) : totalScore.balls
    };
    
    setTotalScore(newScore);
    
    // Check for match end conditions in 2nd innings
    if (currentInnings === 2 && firstInningsScore) {
      const target = firstInningsScore.runs + 1;
      const wicketsDown = newScore.wickets >= 10;
      const targetChased = newScore.runs >= target;
      
      if (targetChased || wicketsDown) {
        setIsInningsComplete(true);
        calculateMatchWinner();
        setIsMatchComplete(true);
        clearSavedState();
        return; // Exit early to prevent further processing
      }
    }
    
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
        
        // Save previous bowler so they can't bowl consecutive overs
        setPreviousBowler(bowler);
        
        // Check if innings is complete after this over (overs limit or all out)
        const isOversComplete = currentOver >= match.oversPerSide;
        const isAllOut = newScore.wickets >= 10;
        
        if (isOversComplete || isAllOut) {
          setIsInningsComplete(true);
          // Check if this is the end of first or second innings
          if (currentInnings === 1) {
            // Save first innings score
            setFirstInningsScore(newScore);
            setShowInningsBreak(true);
          } else {
            // Calculate winner and margin
            calculateMatchWinner();
            setIsMatchComplete(true);
            // Clear saved state when match is complete
            clearSavedState();
          }
        } else {
          // Block all ball entry until bowler is changed
          setNeedsBowlerChange(true);
        }
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

  // Quick entry buttons with pastel color scheme matching the legend
  const quickEntryButtons = [
    { label: "0", entry: { runs: 0, isWide: false, isNoBall: false, isWicket: false, extras: 0 }, color: "bg-gray-300 hover:bg-gray-400 text-gray-800" },
    { label: "1", entry: { runs: 1, isWide: false, isNoBall: false, isWicket: false, extras: 0 }, color: "bg-blue-300 hover:bg-blue-400 text-blue-800" },
    { label: "2", entry: { runs: 2, isWide: false, isNoBall: false, isWicket: false, extras: 0 }, color: "bg-blue-300 hover:bg-blue-400 text-blue-800" },
    { label: "3", entry: { runs: 3, isWide: false, isNoBall: false, isWicket: false, extras: 0 }, color: "bg-blue-300 hover:bg-blue-400 text-blue-800" },
    { label: "4", entry: { runs: 4, isWide: false, isNoBall: false, isWicket: false, extras: 0 }, color: "bg-green-300 hover:bg-green-400 text-green-800" },
    { label: "5", entry: { runs: 5, isWide: false, isNoBall: false, isWicket: false, extras: 0 }, color: "bg-blue-300 hover:bg-blue-400 text-blue-800" },
    { label: "6", entry: { runs: 6, isWide: false, isNoBall: false, isWicket: false, extras: 0 }, color: "bg-green-300 hover:bg-green-400 text-green-800" },
    { label: "W", entry: { runs: 0, isWide: false, isNoBall: false, isWicket: true, extras: 0 }, color: "bg-red-300 hover:bg-red-400 text-red-800" },
    { label: "WD", entry: { runs: 0, isWide: true, isNoBall: false, isWicket: false, extras: 1 }, color: "bg-orange-300 hover:bg-orange-400 text-orange-800" },
    { label: "NB", isSpecial: true, color: "bg-orange-300 hover:bg-orange-400 text-orange-800" },
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

  // Calculate match winner
  const calculateMatchWinner = () => {
    if (!firstInningsScore) return;
    
    // team1 batted first, team2 batted second (always)
    const team1 = match.team1;
    const team2 = match.team2;
    
    const firstInningsRuns = firstInningsScore.runs;
    const firstInningsWickets = firstInningsScore.wickets;
    const secondInningsRuns = totalScore.runs;
    const secondInningsWickets = totalScore.wickets;
    
    let winner: { teamName: string; margin: string };
    let winningTeamId: number;
    
    if (secondInningsRuns > firstInningsRuns) {
      // Team batting second (team2) wins - margin by wickets
      const wicketsRemaining = 10 - secondInningsWickets;
      winner = {
        teamName: team2.name,
        margin: `by ${wicketsRemaining} wickets`
      };
      winningTeamId = team2.id;
    } else if (secondInningsRuns < firstInningsRuns) {
      // Team batting first (team1) wins - margin by runs
      const runsMargin = firstInningsRuns - secondInningsRuns;
      winner = {
        teamName: team1.name,
        margin: `by ${runsMargin} runs`
      };
      winningTeamId = team1.id;
    } else {
      // Tie
      winner = {
        teamName: "Match Tied",
        margin: ""
      };
      winningTeamId = 0;
    }
    
    setMatchWinner(winner);
    
    if (winner.teamName !== "Match Tied") {
      updateMatchMutation.mutate({
        matchId: match.id,
        isCompleted: true,
        winningTeamId
      });
    }
  };
  
  // Mutation to update match completion
  const updateMatchMutation = useMutation({
    mutationFn: async ({ matchId, isCompleted, winningTeamId }: { matchId: number; isCompleted: boolean; winningTeamId: number }) => {
      const response = await apiRequest('PATCH', `/api/matches/${matchId}`, { isCompleted, winningTeamId });
      return await response.json();
    }
  });

  // Start second innings
  const startSecondInnings = () => {
    // Save first innings balls before clearing
    setFirstInningsBalls(allBalls);
    
    // Swap batting and bowling teams
    const newBattingTeam = match.bowlingTeam;
    const newBowlingTeam = match.battingTeam;
    
    // Update match object (note: this is local state, not persisted)
    match.currentInnings = 2;
    match.battingTeam = newBattingTeam;
    match.bowlingTeam = newBowlingTeam;
    
    // Reset all game state for new innings
    setCurrentInnings(2);
    setCurrentOver(1);
    setCurrentBallInOver(1);
    setBallPosition(1);
    setOverBalls([]);
    setAllBalls([]); // Clear current innings balls
    setTotalScore({ runs: 0, wickets: 0, overs: 0, balls: 0 });
    setRunRate(0);
    setDismissedPlayers([]);
    setPreviousBowler(null); // Reset previous bowler for new innings
    
    // Clear player selections (they need to be reselected)
    setStriker({ id: 0, name: "" });
    setNonStriker({ id: 0, name: "" });
    setBowler({ id: 0, name: "" });
    
    // Reset state flags
    setIsInningsComplete(false);
    setShowInningsBreak(false);
    setNeedsBowlerChange(false);
    setNeedsBatsmanChange(false);
    setNeedsInningsSetup(true); // Special flag for innings setup
    setSingleBattingMode(false);
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
          {/* First Innings Score Display */}
          {currentInnings === 2 && firstInningsScore && (
            <div className="mb-4 p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">First Innings:</div>
              <div className="font-medium">
                {match.team1.id === match.battingTeam.id ? match.team2.name : match.team1.name}: {firstInningsScore.runs}/{firstInningsScore.wickets} ({firstInningsScore.overs}.{firstInningsScore.balls} overs)
              </div>
              {(() => {
                const target = firstInningsScore.runs + 1;
                const runsRequired = target - totalScore.runs;
                const ballsCompleted = totalScore.overs * 6 + totalScore.balls;
                const ballsRemaining = (match.oversPerSide * 6) - ballsCompleted;
                
                if (runsRequired > 0) {
                  return (
                    <div className="mt-2 text-lg font-bold text-orange-600 dark:text-orange-400">
                      Need {runsRequired} runs in {ballsRemaining} balls
                    </div>
                  );
                }
              })()}
            </div>
          )}
          
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
                      player.id !== previousBowler?.id &&
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

      {/* Innings Break Alert */}
      {showInningsBreak && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-blue-700 dark:text-blue-300">
                <Trophy className="h-5 w-5" />
                <span className="font-medium">First Innings Complete!</span>
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">
                {match.battingTeam.name} scored {totalScore.runs}/{totalScore.wickets} in {match.oversPerSide} overs
              </div>
              <Button
                onClick={startSecondInnings}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Start Second Innings
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Match Complete Alert */}
      {isMatchComplete && matchWinner && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
                <Trophy className="h-6 w-6" />
                <span className="font-bold text-lg">Match Complete!</span>
              </div>
              <div className="text-lg font-bold text-green-700 dark:text-green-300">
                {matchWinner.teamName} {matchWinner.margin !== "" ? "wins " + matchWinner.margin : ""}
              </div>
              <div className="text-sm text-green-600 dark:text-green-400">
                Final Score: {match.battingTeam.name} {totalScore.runs}/{totalScore.wickets} vs {firstInningsScore ? `${firstInningsScore.runs}/${firstInningsScore.wickets}` : ''}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Single Innings Complete Alert (fallback) */}
      {isInningsComplete && !showInningsBreak && !isMatchComplete && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Innings Complete! {match.oversPerSide} overs bowled</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Innings Setup Alert - For second innings */}
      {needsInningsSetup && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Second innings starting! Please select striker, non-striker, and bowler</span>
              </div>
              <Button
                onClick={() => setNeedsInningsSetup(false)}
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
      
      {/* Bowler Change Alert - Right after Current Players for visibility */}
      {needsBowlerChange && !isInningsComplete && !needsInningsSetup && (
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
      {needsBatsmanChange && !needsInningsSetup && (
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
      {(needsBowlerChange || needsBatsmanChange || needsInningsSetup) && !isInningsComplete && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-2 text-amber-700 dark:text-amber-300">
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div className="font-medium">
                {needsInningsSetup ? (
                  "Setup required for second innings"
                ) : needsBowlerChange && needsBatsmanChange ? (
                  <div className="space-y-1">
                    <div>Required actions:</div>
                    <div className="text-sm">• Change bowler (over completed)</div>
                    <div className="text-sm">• Select new batter (after wicket)</div>
                  </div>
                ) : needsBowlerChange ? (
                  "Bowler change required after over completion"
                ) : (
                  "New batter selection required after wicket"
                )}
              </div>
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
          <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <span className="text-lg md:text-xl">Ball-by-Ball Scoring</span>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant={quickEntryMode ? "default" : "outline"}
                size="sm"
                onClick={() => setQuickEntryMode(true)}
                className="flex-1 sm:flex-none"
              >
                Quick Entry
              </Button>
              <Button
                variant={!quickEntryMode ? "default" : "outline"}
                size="sm"
                onClick={() => setQuickEntryMode(false)}
                className="flex-1 sm:flex-none"
              >
                Custom Entry
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {quickEntryMode ? (
            <div className="space-y-4">
              {/* Responsive grid: 3 cols on mobile, 5 cols on larger screens */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
                {quickEntryButtons.map((button) => (
                  <Button
                    key={button.label}
                    data-testid={`ball-${button.label.toLowerCase()}`}
                    className={`h-14 sm:h-12 text-base sm:text-sm font-bold ${button.color} touch-manipulation`}
                    disabled={needsBowlerChange || needsBatsmanChange || needsInningsSetup || isInningsComplete || isMatchComplete}
                    onClick={() => {
                      if (needsBowlerChange || needsBatsmanChange || needsInningsSetup || isInningsComplete || isMatchComplete) return;
                      if (button.label === "W") {
                        setShowWicketModal(true);
                      } else if (button.label === "NB") {
                        setShowNoBallOptions(true);
                      } else {
                        handleBallEntry(button.entry);
                      }
                    }}
                  >
                    {button.label}
                  </Button>
                ))}
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
              const ballDisplay = ball.ballNumber ? ball.ballNumber.toString().replace('0.', '') : 'Extra';
              let comment = ball.commentary || '';
              
              // Remove batsman and bowler names from commentary for cleaner display
              if (comment.includes(' faces ')) {
                const parts = comment.split(' faces ');
                comment = parts[1]?.split(' ')[0] ? 'Ball bowled' : comment;
              }
              
              return (
                <div key={index} className="text-sm border-b pb-2">
                  <div className="font-medium">
                    {overDisplay}.{ballDisplay} - {comment}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Match Scorecard */}
      {/* First Innings Scorecard (show when in second innings or match complete) */}
      {currentInnings === 2 && firstInningsBalls.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {match.team1.id === match.battingTeam.id 
                ? `Team ${match.team2.name.replace('Team ', '').replace("'s Team", "")}`
                : `Team ${match.team1.name.replace('Team ', '').replace("'s Team", "")}`} - Innings 1
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* First Innings Batting */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Batting</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">Batsman</th>
                        <th className="text-left py-2 px-2">How Out</th>
                        <th className="text-right py-2 px-1">R</th>
                        <th className="text-right py-2 px-1">B</th>
                        <th className="text-right py-2 px-1">4s</th>
                        <th className="text-right py-2 px-1">6s</th>
                        <th className="text-right py-2 px-1">SR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const batsmanStats = {};
                        const dismissalInfo = {};
                        
                        firstInningsBalls.forEach(ball => {
                          const batsman = ball.striker;
                          if (!batsmanStats[batsman]) {
                            batsmanStats[batsman] = { runs: 0, balls: 0, fours: 0, sixes: 0 };
                          }
                          
                          // Track dismissal information
                          if (ball.entry.isWicket) {
                            const wicketType = ball.entry.wicketType || '';
                            const bowlerName = ball.bowler;
                            const fielderPlayer = ball.entry.fielderId ? 
                              [...battingTeamPlayers, ...bowlingTeamPlayers].find(p => p.id === ball.entry.fielderId) : null;
                            const fielderName = fielderPlayer?.name || '';
                            
                            // Get the batsman who was out from wicketPlayerId
                            const batsmanOutPlayer = ball.entry.wicketPlayerId ? 
                              [...battingTeamPlayers, ...bowlingTeamPlayers].find(p => p.id === ball.entry.wicketPlayerId) : null;
                            const batsmanOut = batsmanOutPlayer?.name || ball.striker;
                            
                            let dismissalText = '';
                            if (wicketType === 'Bowled') {
                              dismissalText = `b. ${bowlerName}`;
                            } else if (wicketType === 'Caught') {
                              dismissalText = fielderName ? `c. ${fielderName} b. ${bowlerName}` : `c & b ${bowlerName}`;
                            } else if (wicketType === 'Run Out') {
                              dismissalText = fielderName ? `run out (${fielderName})` : 'run out';
                            } else if (wicketType === 'Stumped') {
                              dismissalText = `st. ${fielderName} b. ${bowlerName}`;
                            } else if (wicketType === 'Hit Wicket') {
                              dismissalText = `hit wicket b. ${bowlerName}`;
                            } else if (wicketType === 'Boundary Out') {
                              dismissalText = 'boundary out';
                            } else {
                              dismissalText = wicketType.toLowerCase();
                            }
                            
                            dismissalInfo[batsmanOut] = dismissalText;
                          }
                          
                          if (!ball.entry.isWide && !ball.entry.isNoBall) batsmanStats[batsman].balls++;
                          batsmanStats[batsman].runs += ball.entry.runs;
                          if (ball.entry.runs === 4) batsmanStats[batsman].fours++;
                          if (ball.entry.runs === 6) batsmanStats[batsman].sixes++;
                        });
                        
                        return Object.entries(batsmanStats).map(([batsman, stats]) => {
                          const sr = stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(1) : '0.0';
                          const howOut = dismissalInfo[batsman] || 'not out';
                          
                          return (
                            <tr key={batsman} className="border-b">
                              <td className="py-2 px-2 font-medium">{batsman}</td>
                              <td className="py-2 px-2 text-muted-foreground text-xs">{howOut}</td>
                              <td className="py-2 px-1 text-right font-semibold">{stats.runs}</td>
                              <td className="py-2 px-1 text-right">{stats.balls}</td>
                              <td className="py-2 px-1 text-right">{stats.fours}</td>
                              <td className="py-2 px-1 text-right">{stats.sixes}</td>
                              <td className="py-2 px-1 text-right">{sr}</td>
                            </tr>
                          );
                        });
                      })()}
                      <tr className="bg-muted/50">
                        <td className="py-3 px-2 font-bold">Total</td>
                        <td className="py-3 px-2 text-muted-foreground">
                          {firstInningsScore?.overs}.{firstInningsScore?.balls} Ov
                        </td>
                        <td className="py-3 px-1 text-right font-bold text-lg">{firstInningsScore?.runs}/{firstInningsScore?.wickets}</td>
                        <td colSpan={4}></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* First Innings Bowling */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Bowling</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">Bowler</th>
                        <th className="text-right py-2 px-1">O</th>
                        <th className="text-right py-2 px-1">R</th>
                        <th className="text-right py-2 px-1">W</th>
                        <th className="text-right py-2 px-1">ECON</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const bowlerStats = {};
                        firstInningsBalls.forEach(ball => {
                          const bowlerName = ball.bowler;
                          if (!bowlerStats[bowlerName]) bowlerStats[bowlerName] = { balls: 0, runs: 0, wickets: 0 };
                          if (!ball.entry.isWide && !ball.entry.isNoBall) bowlerStats[bowlerName].balls++;
                          bowlerStats[bowlerName].runs += ball.entry.runs + ball.entry.extras;
                          if (ball.entry.isWicket) bowlerStats[bowlerName].wickets++;
                        });
                        return Object.entries(bowlerStats).map(([bowlerName, stats]) => {
                          const overs = Math.floor(stats.balls / 6) + (stats.balls % 6 > 0 ? `.${stats.balls % 6}` : '');
                          const economy = stats.balls > 0 ? ((stats.runs / stats.balls) * 6).toFixed(2) : '0.00';
                          return (
                            <tr key={bowlerName} className="border-b">
                              <td className="py-2 px-2 font-medium">{bowlerName}</td>
                              <td className="py-2 px-1 text-right">{overs}</td>
                              <td className="py-2 px-1 text-right">{stats.runs}</td>
                              <td className="py-2 px-1 text-right font-semibold">{stats.wickets}</td>
                              <td className="py-2 px-1 text-right">{economy}</td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Innings Scorecard */}
      <Card>
        <CardHeader>
          <CardTitle>
            Team {match.battingTeam.name.replace('Team ', '').replace("'s Team", "")} - Innings {currentInnings}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Batting Statistics */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Batting</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Batsman</th>
                      <th className="text-left py-2 px-2">How Out</th>
                      <th className="text-right py-2 px-1">R</th>
                      <th className="text-right py-2 px-1">B</th>
                      <th className="text-right py-2 px-1">4s</th>
                      <th className="text-right py-2 px-1">6s</th>
                      <th className="text-right py-2 px-1">SR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // Calculate batting statistics from allBalls
                      const batsmanStats = {};
                      const dismissalInfo = {};
                      
                      allBalls.forEach(ball => {
                        const batsman = ball.striker;
                        if (!batsmanStats[batsman]) {
                          batsmanStats[batsman] = {
                            runs: 0,
                            balls: 0,
                            fours: 0,
                            sixes: 0,
                            isOut: dismissedPlayers.includes(battingPlayers.find(p => p.name === batsman)?.id),
                            isOnStrike: batsman === striker?.name,
                            isNonStriker: batsman === nonStriker?.name
                          };
                        }
                        
                        // Track dismissal information
                        if (ball.entry.isWicket) {
                          const wicketType = ball.entry.wicketType || '';
                          const bowlerName = ball.bowler;
                          const fielderPlayer = ball.entry.fielderId ? 
                            [...battingTeamPlayers, ...bowlingTeamPlayers].find(p => p.id === ball.entry.fielderId) : null;
                          const fielderName = fielderPlayer?.name || '';
                          
                          // Get the batsman who was out from wicketPlayerId
                          const batsmanOutPlayer = ball.entry.wicketPlayerId ? 
                            [...battingTeamPlayers, ...bowlingTeamPlayers].find(p => p.id === ball.entry.wicketPlayerId) : null;
                          const batsmanOut = batsmanOutPlayer?.name || ball.striker;
                          
                          // Format dismissal text professionally
                          let dismissalText = '';
                          if (wicketType === 'Bowled') {
                            dismissalText = `b. ${bowlerName}`;
                          } else if (wicketType === 'Caught') {
                            dismissalText = fielderName ? `c. ${fielderName} b. ${bowlerName}` : `c & b ${bowlerName}`;
                          } else if (wicketType === 'Run Out') {
                            dismissalText = fielderName ? `run out (${fielderName})` : 'run out';
                          } else if (wicketType === 'Stumped') {
                            dismissalText = `st. ${fielderName} b. ${bowlerName}`;
                          } else if (wicketType === 'Hit Wicket') {
                            dismissalText = `hit wicket b. ${bowlerName}`;
                          } else if (wicketType === 'Boundary Out') {
                            dismissalText = 'boundary out';
                          } else {
                            dismissalText = wicketType.toLowerCase();
                          }
                          
                          dismissalInfo[batsmanOut] = dismissalText;
                        }
                        
                        // Only count valid balls for balls faced
                        if (!ball.entry.isWide && !ball.entry.isNoBall) {
                          batsmanStats[batsman].balls++;
                        }
                        
                        // Count runs scored by this batsman
                        batsmanStats[batsman].runs += ball.entry.runs;
                        
                        // Count boundaries
                        if (ball.entry.runs === 4) batsmanStats[batsman].fours++;
                        if (ball.entry.runs === 6) batsmanStats[batsman].sixes++;
                      });

                      return Object.entries(batsmanStats).map(([batsman, stats]) => {
                        const strikeRate = stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(1) : '0.0';
                        
                        // Determine how out status
                        let howOut = '';
                        if (dismissalInfo[batsman]) {
                          howOut = dismissalInfo[batsman];
                        } else if (stats.isOut) {
                          howOut = 'out';
                        } else if (stats.isOnStrike) {
                          howOut = 'not out *';
                        } else {
                          howOut = 'not out';
                        }
                        
                        return (
                          <tr key={batsman} className="border-b">
                            <td className="py-2 px-2 font-medium">{batsman}</td>
                            <td className="py-2 px-2 text-muted-foreground text-xs">{howOut}</td>
                            <td className="py-2 px-1 text-right font-semibold">{stats.runs}</td>
                            <td className="py-2 px-1 text-right">{stats.balls}</td>
                            <td className="py-2 px-1 text-right">{stats.fours}</td>
                            <td className="py-2 px-1 text-right">{stats.sixes}</td>
                            <td className="py-2 px-1 text-right">{strikeRate}</td>
                          </tr>
                        );
                      });
                    })()}
                    <tr className="border-b-2 border-foreground">
                      <td className="py-2 px-2 font-bold">Extras</td>
                      <td className="py-2 px-2 text-muted-foreground">
                        {(() => {
                          const wides = allBalls.filter(b => b.entry.isWide).length;
                          const noBalls = allBalls.filter(b => b.entry.isNoBall).length;
                          const extras = [];
                          if (wides > 0) extras.push(`w ${wides}`);
                          if (noBalls > 0) extras.push(`nb ${noBalls}`);
                          return extras.length > 0 ? `(${extras.join(', ')})` : '';
                        })()}
                      </td>
                      <td className="py-2 px-1 text-right font-bold">
                        {allBalls.reduce((sum, ball) => sum + ball.entry.extras, 0)}
                      </td>
                      <td className="py-2 px-1 text-right">-</td>
                      <td className="py-2 px-1 text-right">-</td>
                      <td className="py-2 px-1 text-right">-</td>
                      <td className="py-2 px-1 text-right">-</td>
                    </tr>
                    <tr className="bg-muted/50">
                      <td className="py-3 px-2 font-bold">Total</td>
                      <td className="py-3 px-2 text-muted-foreground">
                        {totalScore.overs}.{totalScore.balls} Ov (RR: {runRate.toFixed(2)})
                      </td>
                      <td className="py-3 px-1 text-right font-bold text-lg">{totalScore.runs}</td>
                      <td className="py-3 px-1 text-right">-</td>
                      <td className="py-3 px-1 text-right">-</td>
                      <td className="py-3 px-1 text-right">-</td>
                      <td className="py-3 px-1 text-right">-</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bowling Statistics */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Bowling</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Bowler</th>
                      <th className="text-right py-2 px-1">O</th>
                      <th className="text-right py-2 px-1">M</th>
                      <th className="text-right py-2 px-1">R</th>
                      <th className="text-right py-2 px-1">W</th>
                      <th className="text-right py-2 px-1">ECON</th>
                      <th className="text-right py-2 px-1">WD</th>
                      <th className="text-right py-2 px-1">NB</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // Calculate bowling statistics from allBalls
                      const bowlerStats = {};
                      
                      allBalls.forEach(ball => {
                        const bowlerName = ball.bowler;
                        if (!bowlerStats[bowlerName]) {
                          bowlerStats[bowlerName] = {
                            overs: 0,
                            balls: 0,
                            maidens: 0,
                            runs: 0,
                            wickets: 0,
                            wides: 0,
                            noBalls: 0
                          };
                        }
                        
                        const stats = bowlerStats[bowlerName];
                        
                        // Count valid balls
                        if (!ball.entry.isWide && !ball.entry.isNoBall) {
                          stats.balls++;
                        }
                        
                        // Count runs conceded (including extras)
                        stats.runs += ball.entry.runs + ball.entry.extras;
                        
                        // Count wickets
                        if (ball.entry.isWicket) {
                          stats.wickets++;
                        }
                        
                        // Count extras
                        if (ball.entry.isWide) stats.wides++;
                        if (ball.entry.isNoBall) stats.noBalls++;
                      });

                      // Calculate overs from balls
                      Object.values(bowlerStats).forEach(stats => {
                        stats.overs = Math.floor(stats.balls / 6) + (stats.balls % 6) / 10;
                      });

                      return Object.entries(bowlerStats).map(([bowlerName, stats]) => {
                        const economy = stats.overs > 0 ? (stats.runs / stats.overs).toFixed(2) : '0.00';
                        const oversDisplay = Math.floor(stats.balls / 6) + (stats.balls % 6 > 0 ? `.${stats.balls % 6}` : '');
                        
                        return (
                          <tr key={bowlerName} className="border-b">
                            <td className="py-2 px-2 font-medium">{bowlerName}</td>
                            <td className="py-2 px-1 text-right">{oversDisplay}</td>
                            <td className="py-2 px-1 text-right">{stats.maidens}</td>
                            <td className="py-2 px-1 text-right">{stats.runs}</td>
                            <td className="py-2 px-1 text-right font-semibold">{stats.wickets}</td>
                            <td className="py-2 px-1 text-right">{economy}</td>
                            <td className="py-2 px-1 text-right">{stats.wides}</td>
                            <td className="py-2 px-1 text-right">{stats.noBalls}</td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
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
                className={`h-12 font-bold ${
                  runs === 0 
                    ? 'bg-gray-300 hover:bg-gray-400 text-gray-800'
                    : runs === 4 || runs === 6
                    ? 'bg-green-300 hover:bg-green-400 text-green-800'
                    : 'bg-blue-300 hover:bg-blue-400 text-blue-800'
                }`}
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