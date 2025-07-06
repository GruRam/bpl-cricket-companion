import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeft, Users, Play, Settings, Shuffle, UserX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Player, Team } from "@shared/schema";
import type { CurrentMatch } from "@/lib/types";

interface MatchSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMatchStart: (match: CurrentMatch) => void;
  activeSeries: any;
}

type PlayerStatus = "team1" | "team2" | "common" | "unavailable";

interface MatchPlayer {
  player: Player;
  status: PlayerStatus;
  originalTeam: "team1" | "team2";
}

export default function MatchSetupModal({ isOpen, onClose, onMatchStart, activeSeries }: MatchSetupModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [oversPerSide, setOversPerSide] = useState(8);
  const [matchPlayers, setMatchPlayers] = useState<MatchPlayer[]>([]);
  const [team1Name, setTeam1Name] = useState("");
  const [team2Name, setTeam2Name] = useState("");
  const [firstBattingTeam, setFirstBattingTeam] = useState<"team1" | "team2">("team1");
  const [striker, setStriker] = useState<Player | null>(null);
  const [nonStriker, setNonStriker] = useState<Player | null>(null);
  const [bowler, setBowler] = useState<Player | null>(null);
  const { toast } = useToast();

  // Fetch series teams
  const { data: seriesTeams } = useQuery<Team[]>({
    queryKey: ["/api/series", activeSeries?.id, "teams"],
    enabled: !!activeSeries?.id && isOpen,
  });



  // Fetch team players
  const { data: team1Players = [] } = useQuery<Player[]>({
    queryKey: ["/api/teams", seriesTeams?.[0]?.id, "players"],
    select: (data: any) => data?.map((tp: any) => tp.player) || [],
    enabled: !!seriesTeams?.[0]?.id && isOpen,
  });

  const { data: team2Players = [] } = useQuery<Player[]>({
    queryKey: ["/api/teams", seriesTeams?.[1]?.id, "players"],
    select: (data: any) => data?.map((tp: any) => tp.player) || [],
    enabled: !!seriesTeams?.[1]?.id && isOpen,
  });

  // Initialize team names and players when data is available
  useEffect(() => {
    if (seriesTeams && seriesTeams.length >= 2) {
      // Use actual team names consistently
      setTeam1Name(seriesTeams[0]?.name || "");
      setTeam2Name(seriesTeams[1]?.name || "");
      
      // Initialize players when both teams have players loaded
      if (team1Players.length > 0 || team2Players.length > 0) {
        const initialMatchPlayers: MatchPlayer[] = [
          ...team1Players.map(player => ({
            player,
            status: "team1" as PlayerStatus,
            originalTeam: "team1" as const
          })),
          ...team2Players.map(player => ({
            player,
            status: "team2" as PlayerStatus,
            originalTeam: "team2" as const
          }))
        ];

        setMatchPlayers(initialMatchPlayers.sort((a, b) => a.player.name.localeCompare(b.player.name)));
      }
    }
  }, [seriesTeams, team1Players, team2Players]);

  const changePlayerStatus = (playerId: number, newStatus: PlayerStatus) => {
    setMatchPlayers(prev =>
      prev.map(mp =>
        mp.player.id === playerId ? { ...mp, status: newStatus } : mp
      )
    );
  };

  const getActiveTeam1Players = () => matchPlayers.filter(mp => mp.status === "team1" || mp.status === "common");
  const getActiveTeam2Players = () => matchPlayers.filter(mp => mp.status === "team2" || mp.status === "common");

  const canProceed = () => {
    if (currentStep === 1) return team1Name && team2Name; // Basic settings with team names loaded
    if (currentStep === 2) return true; // Team customization
    if (currentStep === 3) {
      // Final setup - ensure we have selected players
      return striker && nonStriker && bowler &&
             getActiveTeam1Players().length > 0 && 
             getActiveTeam2Players().length > 0;
    }
    return false;
  };

  const handleNext = () => {
    if (canProceed()) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleStartMatch = () => {
    if (!canProceed()) return;

    const battingTeam = firstBattingTeam === "team1" ? 
      { id: seriesTeams![0].id, name: team1Name } : 
      { id: seriesTeams![1].id, name: team2Name };
    
    const bowlingTeam = firstBattingTeam === "team1" ? 
      { id: seriesTeams![1].id, name: team2Name } : 
      { id: seriesTeams![0].id, name: team1Name };

    const match: CurrentMatch = {
      id: Date.now(),
      team1: { id: seriesTeams![0].id, name: team1Name },
      team2: { id: seriesTeams![1].id, name: team2Name },
      currentInnings: 1,
      battingTeam,
      bowlingTeam,
      score: { runs: 0, wickets: 0, overs: 0, balls: 0 },
      currentOver: 1,
      currentBall: 1,
      striker: striker!,
      nonStriker: nonStriker!,
      bowler: bowler!,
    };

    onMatchStart(match);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Match Setup
          </DialogTitle>
          <DialogDescription>
            Step {currentStep} of 3
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Match Setup</h3>
                <p className="text-sm text-muted-foreground">
                  Active Series: <span className="font-bold">{activeSeries?.name}</span>
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="overs">Overs per side</Label>
                  <Select value={oversPerSide.toString()} onValueChange={(value) => setOversPerSide(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 6, 7, 8, 9, 10, 12, 15, 20].map(overs => (
                        <SelectItem key={overs} value={overs.toString()}>{overs} overs</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>First batting team</Label>
                  {team1Name && team2Name ? (
                    <Select value={firstBattingTeam} onValueChange={(value: "team1" | "team2") => setFirstBattingTeam(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="team1">{team1Name}</SelectItem>
                        <SelectItem value="team2">{team2Name}</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-2 text-center text-muted-foreground">
                      Loading team information...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Customize Teams for this Match</h3>
                <p className="text-sm text-muted-foreground">Modify player assignments for this match only</p>
              </div>

              {team1Name && team2Name ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {team1Name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {getActiveTeam1Players().map(({ player, status, originalTeam }) => (
                        <div key={player.id} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{player.name}</span>
                            {status === "common" && <Badge variant="secondary">Common</Badge>}
                            {originalTeam !== "team1" && <Badge variant="outline">Switched</Badge>}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => changePlayerStatus(player.id, "team2")}
                              title="Switch to other team"
                            >
                              <Shuffle className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => changePlayerStatus(player.id, "common")}
                              title="Make common player"
                            >
                              <Users className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => changePlayerStatus(player.id, "unavailable")}
                              title="Mark unavailable"
                            >
                              <UserX className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {team2Name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {getActiveTeam2Players().map(({ player, status, originalTeam }) => (
                        <div key={player.id} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{player.name}</span>
                            {status === "common" && <Badge variant="secondary">Common</Badge>}
                            {originalTeam !== "team2" && <Badge variant="outline">Switched</Badge>}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => changePlayerStatus(player.id, "team1")}
                              title="Switch to other team"
                            >
                              <Shuffle className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => changePlayerStatus(player.id, "common")}
                              title="Make common player"
                            >
                              <Users className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => changePlayerStatus(player.id, "unavailable")}
                              title="Mark unavailable"
                            >
                              <UserX className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  Loading team information...
                </div>
              )}

              {matchPlayers.filter(mp => mp.status === "unavailable").length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserX className="h-4 w-4" />
                      Unavailable Players
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {matchPlayers.filter(mp => mp.status === "unavailable").map(({ player, originalTeam }) => (
                        <div key={player.id} className="flex items-center gap-2 p-2 bg-muted rounded">
                          <span className="font-medium">{player.name}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => changePlayerStatus(player.id, originalTeam)}
                          >
                            Restore
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Final Setup</h3>
                <p className="text-sm text-muted-foreground">Select starting players</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Striker</Label>
                  <Select value={striker?.id.toString() || ""} onValueChange={(value) => {
                    const player = getActiveTeam1Players().find(mp => mp.player.id === parseInt(value))?.player;
                    setStriker(player || null);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select striker" />
                    </SelectTrigger>
                    <SelectContent>
                      {getActiveTeam1Players().map(({ player }) => (
                        <SelectItem key={player.id} value={player.id.toString()}>
                          {player.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Non-Striker</Label>
                  <Select value={nonStriker?.id.toString() || ""} onValueChange={(value) => {
                    const player = getActiveTeam1Players().find(mp => mp.player.id === parseInt(value))?.player;
                    setNonStriker(player || null);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select non-striker" />
                    </SelectTrigger>
                    <SelectContent>
                      {getActiveTeam1Players().map(({ player }) => (
                        <SelectItem key={player.id} value={player.id.toString()}>
                          {player.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Bowler</Label>
                  <Select value={bowler?.id.toString() || ""} onValueChange={(value) => {
                    const player = getActiveTeam2Players().find(mp => mp.player.id === parseInt(value))?.player;
                    setBowler(player || null);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select bowler" />
                    </SelectTrigger>
                    <SelectContent>
                      {getActiveTeam2Players().map(({ player }) => (
                        <SelectItem key={player.id} value={player.id.toString()}>
                          {player.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          <div className="flex gap-2">
            {currentStep < 3 ? (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleStartMatch} disabled={!canProceed()}>
                <Play className="h-4 w-4 mr-2" />
                Start Match
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}