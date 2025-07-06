import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, ArrowLeft, Users, Play, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Player, Team } from "@shared/schema";
import type { CurrentMatch } from "@/lib/types";

interface MatchSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMatchStart: (match: CurrentMatch) => void;
  activeSeries: any;
}

export default function MatchSetupModal({ isOpen, onClose, onMatchStart, activeSeries }: MatchSetupModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [oversPerSide, setOversPerSide] = useState(8);
  const [team1Name, setTeam1Name] = useState("");
  const [team2Name, setTeam2Name] = useState("");
  const [team1Players, setTeam1Players] = useState<Player[]>([]);
  const [team2Players, setTeam2Players] = useState<Player[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
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

  // Fetch all players
  const { data: allPlayers = [] } = useQuery<Player[]>({
    queryKey: ["/api/players"],
    enabled: isOpen,
  });

  // Sort players alphabetically
  const sortedPlayers = [...allPlayers].sort((a, b) => a.name.localeCompare(b.name));

  // Initialize teams and players when modal opens
  useEffect(() => {
    if (seriesTeams && seriesTeams.length >= 2 && isOpen) {
      setTeam1Name(seriesTeams[0].name);
      setTeam2Name(seriesTeams[1].name);
      
      // Fetch team players and initialize
      Promise.all([
        fetch(`/api/teams/${seriesTeams[0].id}/players`).then(res => res.json()),
        fetch(`/api/teams/${seriesTeams[1].id}/players`).then(res => res.json())
      ]).then(([team1PlayersData, team2PlayersData]) => {
        const team1Players = team1PlayersData.map((tp: any) => tp.player);
        const team2Players = team2PlayersData.map((tp: any) => tp.player);
        
        setTeam1Players(team1Players);
        setTeam2Players(team2Players);
        
        // Set available players as those not in either team
        const usedPlayerIds = new Set([...team1Players, ...team2Players].map(p => p.id));
        setAvailablePlayers(sortedPlayers.filter(p => !usedPlayerIds.has(p.id)));
      });
    }
  }, [seriesTeams, isOpen, sortedPlayers]);

  const resetForm = () => {
    setCurrentStep(1);
    setOversPerSide(8);
    setTeam1Name("");
    setTeam2Name("");
    setTeam1Players([]);
    setTeam2Players([]);
    setAvailablePlayers([]);
    setFirstBattingTeam("team1");
    setStriker(null);
    setNonStriker(null);
    setBowler(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (team1Players.length === 0 || team2Players.length === 0) {
        toast({
          title: "Teams Required",
          description: "Both teams must have at least one player.",
          variant: "destructive",
        });
        return;
      }
    }
    if (currentStep === 2) {
      if (!striker || !nonStriker || !bowler) {
        toast({
          title: "Players Required",
          description: "Please select striker, non-striker, and bowler.",
          variant: "destructive",
        });
        return;
      }
    }
    setCurrentStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const movePlayerToTeam = (player: Player, toTeam: 1 | 2) => {
    if (toTeam === 1) {
      setTeam2Players(prev => prev.filter(p => p.id !== player.id));
      setAvailablePlayers(prev => prev.filter(p => p.id !== player.id));
      setTeam1Players(prev => [...prev, player]);
    } else {
      setTeam1Players(prev => prev.filter(p => p.id !== player.id));
      setAvailablePlayers(prev => prev.filter(p => p.id !== player.id));
      setTeam2Players(prev => [...prev, player]);
    }
  };

  const movePlayerToAvailable = (player: Player) => {
    setTeam1Players(prev => prev.filter(p => p.id !== player.id));
    setTeam2Players(prev => prev.filter(p => p.id !== player.id));
    setAvailablePlayers(prev => [...prev, player]);
  };

  const handleStartMatch = () => {
    if (!striker || !nonStriker || !bowler) return;

    const battingTeam = firstBattingTeam === "team1" ? 
      { id: 1, name: team1Name } : 
      { id: 2, name: team2Name };
    
    const bowlingTeam = firstBattingTeam === "team1" ? 
      { id: 2, name: team2Name } : 
      { id: 1, name: team1Name };

    const match: CurrentMatch = {
      id: Date.now(),
      team1: { id: 1, name: team1Name },
      team2: { id: 2, name: team2Name },
      currentInnings: 1,
      battingTeam,
      bowlingTeam,
      score: { runs: 0, wickets: 0, overs: 0, balls: 0 },
      currentOver: 1,
      currentBall: 1,
      striker,
      nonStriker,
      bowler,
    };

    onMatchStart(match);
    handleClose();
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="oversPerSide">Overs per Side</Label>
          <Input
            id="oversPerSide"
            type="number"
            value={oversPerSide}
            onChange={(e) => setOversPerSide(Number(e.target.value))}
            min={1}
            max={50}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Customize Teams for This Match</h3>
        <p className="text-sm text-gray-600">Make changes to team composition for this match only</p>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="team1Name">Team 1 Name</Label>
            <Input
              id="team1Name"
              value={team1Name}
              onChange={(e) => setTeam1Name(e.target.value)}
              placeholder="Enter team 1 name"
            />
          </div>
          <div>
            <Label htmlFor="team2Name">Team 2 Name</Label>
            <Input
              id="team2Name"
              value={team2Name}
              onChange={(e) => setTeam2Name(e.target.value)}
              placeholder="Enter team 2 name"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 max-h-96 overflow-y-auto">
          {/* Team 1 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-purple-700 flex items-center gap-2">
              <Users className="w-4 h-4" />
              {team1Name || "Team 1"}
            </Label>
            <div className="space-y-2 min-h-[250px] p-3 bg-purple-50 rounded-lg border-2 border-dashed border-purple-200">
              {team1Players.map(player => (
                <Card key={player.id} className="bg-white">
                  <CardContent className="p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{player.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => movePlayerToAvailable(player)}
                      >
                        ×
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Available Players */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Available Players
            </Label>
            <div className="space-y-2 min-h-[250px] p-3 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              {availablePlayers.sort((a, b) => a.name.localeCompare(b.name)).map(player => (
                <Card key={player.id} className="bg-white cursor-pointer hover:bg-gray-50">
                  <CardContent className="p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{player.name}</span>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 w-6 p-0 text-purple-600 hover:bg-purple-50"
                          onClick={() => movePlayerToTeam(player, 1)}
                        >
                          <ArrowLeft className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 w-6 p-0 text-green-600 hover:bg-green-50"
                          onClick={() => movePlayerToTeam(player, 2)}
                        >
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Team 2 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-green-700 flex items-center gap-2">
              <Users className="w-4 h-4" />
              {team2Name || "Team 2"}
            </Label>
            <div className="space-y-2 min-h-[250px] p-3 bg-green-50 rounded-lg border-2 border-dashed border-green-200">
              {team2Players.map(player => (
                <Card key={player.id} className="bg-white">
                  <CardContent className="p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{player.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => movePlayerToAvailable(player)}
                      >
                        ×
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Choose First Batting Team & Players</h3>
        <p className="text-sm text-gray-600">Select which team bats first and the opening players</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2">
            First Batting Team
          </Label>
          <Select value={firstBattingTeam} onValueChange={(value: "team1" | "team2") => setFirstBattingTeam(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="team1">{team1Name}</SelectItem>
              <SelectItem value="team2">{team2Name}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2">
              Striker
            </Label>
            <Select
              value={striker?.id.toString() || ""}
              onValueChange={(value) => {
                const battingPlayers = firstBattingTeam === "team1" ? team1Players : team2Players;
                const player = battingPlayers.find(p => p.id.toString() === value);
                if (player) setStriker(player);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select striker" />
              </SelectTrigger>
              <SelectContent>
                {(firstBattingTeam === "team1" ? team1Players : team2Players)
                  .filter(p => p.id !== nonStriker?.id)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(player => (
                    <SelectItem key={player.id} value={player.id.toString()}>
                      {player.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2">
              Non-Striker
            </Label>
            <Select
              value={nonStriker?.id.toString() || ""}
              onValueChange={(value) => {
                const battingPlayers = firstBattingTeam === "team1" ? team1Players : team2Players;
                const player = battingPlayers.find(p => p.id.toString() === value);
                if (player) setNonStriker(player);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select non-striker" />
              </SelectTrigger>
              <SelectContent>
                {(firstBattingTeam === "team1" ? team1Players : team2Players)
                  .filter(p => p.id !== striker?.id)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(player => (
                    <SelectItem key={player.id} value={player.id.toString()}>
                      {player.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2">
            Opening Bowler
          </Label>
          <Select
            value={bowler?.id.toString() || ""}
            onValueChange={(value) => {
              const bowlingPlayers = firstBattingTeam === "team1" ? team2Players : team1Players;
              const player = bowlingPlayers.find(p => p.id.toString() === value);
              if (player) setBowler(player);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select opening bowler" />
            </SelectTrigger>
            <SelectContent>
              {(firstBattingTeam === "team1" ? team2Players : team1Players)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(player => (
                  <SelectItem key={player.id} value={player.id.toString()}>
                    {player.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Match Setup - Step {currentStep} of 2</DialogTitle>
          <DialogDescription>
            {currentStep === 1 && "Configure match settings and customize teams"}
            {currentStep === 2 && "Select first batting team and opening players"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}

          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handlePrevStep}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            {currentStep < 2 ? (
              <Button
                onClick={handleNextStep}
                disabled={team1Players.length === 0 || team2Players.length === 0}
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleStartMatch}
                disabled={!striker || !nonStriker || !bowler}
              >
                <Play className="w-4 h-4 mr-2" />
                Start Match
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}