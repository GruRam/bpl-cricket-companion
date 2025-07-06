import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, Users, ArrowRight, ArrowLeft, Shuffle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { InsertSeries, Player } from "@shared/schema";

interface CreateSeriesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateSeriesModal({ isOpen, onClose }: CreateSeriesModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [seriesName, setSeriesName] = useState("");
  const [targetWins, setTargetWins] = useState(13);
  const [captain1, setCaptain1] = useState<Player | null>(null);
  const [captain2, setCaptain2] = useState<Player | null>(null);
  const [team1Players, setTeam1Players] = useState<Player[]>([]);
  const [team2Players, setTeam2Players] = useState<Player[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const { toast } = useToast();

  // Fetch all players
  const { data: allPlayers = [], isLoading: isLoadingPlayers } = useQuery<Player[]>({
    queryKey: ["/api/players"],
    enabled: isOpen,
  });

  // Initialize available players when data loads
  useEffect(() => {
    if (allPlayers.length > 0 && isOpen) {
      setAvailablePlayers([...allPlayers]);
    }
  }, [allPlayers, isOpen]);

  // Captain randomizer function
  const randomizeCaptains = () => {
    if (availablePlayers.length < 2) {
      toast({
        title: "Not enough players",
        description: "You need at least 2 players to randomize captains.",
        variant: "destructive",
      });
      return;
    }

    // Reset any existing selections
    setAvailablePlayers([...allPlayers]);
    setCaptain1(null);
    setCaptain2(null);

    // Randomly select two different players
    const shuffled = [...allPlayers].sort(() => Math.random() - 0.5);
    const newCaptain1 = shuffled[0];
    const newCaptain2 = shuffled[1];

    setCaptain1(newCaptain1);
    setCaptain2(newCaptain2);
    setAvailablePlayers(shuffled.slice(2));
  };

  // Manual captain selection
  const selectCaptain = (player: Player, captainNumber: 1 | 2) => {
    if (captainNumber === 1) {
      // If this player is already captain 2, swap them
      if (captain2?.id === player.id) {
        setCaptain2(captain1);
        setCaptain1(player);
        return;
      }
      
      // If there was a previous captain 1, add them back to available
      if (captain1) {
        setAvailablePlayers(prev => [...prev, captain1]);
      }
      
      setCaptain1(player);
      setAvailablePlayers(prev => prev.filter(p => p.id !== player.id));
    } else {
      // If this player is already captain 1, swap them
      if (captain1?.id === player.id) {
        setCaptain1(captain2);
        setCaptain2(player);
        return;
      }
      
      // If there was a previous captain 2, add them back to available
      if (captain2) {
        setAvailablePlayers(prev => [...prev, captain2]);
      }
      
      setCaptain2(player);
      setAvailablePlayers(prev => prev.filter(p => p.id !== player.id));
    }
  };

  // Initialize team setup when moving to step 2
  const initializeTeamSetup = () => {
    if (captain1 && captain2) {
      setTeam1Players([captain1]);
      setTeam2Players([captain2]);
    }
  };

  // Move player between teams
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

  // Move player back to available
  const movePlayerToAvailable = (player: Player) => {
    // Don't allow moving captains back to available
    if (player.id === captain1?.id || player.id === captain2?.id) return;
    
    setTeam1Players(prev => prev.filter(p => p.id !== player.id));
    setTeam2Players(prev => prev.filter(p => p.id !== player.id));
    setAvailablePlayers(prev => [...prev, player]);
  };

  const createSeriesMutation = useMutation({
    mutationFn: async () => {
      // Create series first
      const seriesData: InsertSeries = {
        name: seriesName,
        targetWins,
        isActive: true
      };
      
      const seriesResponse = await apiRequest("POST", "/api/series", seriesData);
      const series = await seriesResponse.json();
      
      // Create teams with captains and players
      const team1Response = await apiRequest("POST", "/api/teams", {
        name: `${captain1?.name}'s Team`,
        seriesId: series.id,
        captainId: captain1?.id
      });
      const team1 = await team1Response.json();
      
      const team2Response = await apiRequest("POST", "/api/teams", {
        name: `${captain2?.name}'s Team`,
        seriesId: series.id,
        captainId: captain2?.id
      });
      const team2 = await team2Response.json();
      
      // Add all team 1 players to the team
      for (const player of team1Players) {
        await apiRequest("POST", `/api/teams/${team1.id}/players`, {
          playerId: player.id,
          seriesId: series.id
        });
      }
      
      // Add all team 2 players to the team
      for (const player of team2Players) {
        await apiRequest("POST", `/api/teams/${team2.id}/players`, {
          playerId: player.id,
          seriesId: series.id
        });
      }
      
      return series;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/series/active"] });
      toast({
        title: "Series Created",
        description: "Your new series with teams has been created successfully!",
      });
      onClose();
      resetForm();
    },
    onError: (error) => {
      console.error("Error creating series:", error);
      toast({
        title: "Error",
        description: "Failed to create series. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setCurrentStep(1);
    setSeriesName("");
    setTargetWins(13);
    setCaptain1(null);
    setCaptain2(null);
    setTeam1Players([]);
    setTeam2Players([]);
    setAvailablePlayers([...allPlayers]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!seriesName || !captain1 || !captain2) return;
      initializeTeamSetup();
    }
    setCurrentStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleCreateSeries = () => {
    createSeriesMutation.mutate();
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="seriesName">Series Name</Label>
          <Input
            id="seriesName"
            value={seriesName}
            onChange={(e) => setSeriesName(e.target.value)}
            placeholder="Enter series name"
          />
        </div>
        <div>
          <Label htmlFor="targetWins">Target Wins</Label>
          <Input
            id="targetWins"
            type="number"
            value={targetWins}
            onChange={(e) => setTargetWins(Number(e.target.value))}
            min={1}
            max={50}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Select Captains</h3>
          <Button
            type="button"
            variant="outline"
            onClick={randomizeCaptains}
            className="flex items-center gap-2"
          >
            <Shuffle className="w-4 h-4" />
            Randomize Captains
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <Label className="text-sm font-medium text-purple-700 flex items-center gap-2">
              <Crown className="w-4 h-4" />
              Captain 1
            </Label>
            {captain1 ? (
              <Card className="mt-2 border-purple-200 bg-purple-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-purple-600" />
                      <span className="font-medium">{captain1.name}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setAvailablePlayers(prev => [...prev, captain1]);
                        setCaptain1(null);
                      }}
                    >
                      Change
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="mt-2 text-sm text-gray-500">Click on a player below or use randomizer</div>
            )}
          </div>

          <div>
            <Label className="text-sm font-medium text-green-700 flex items-center gap-2">
              <Crown className="w-4 h-4" />
              Captain 2
            </Label>
            {captain2 ? (
              <Card className="mt-2 border-green-200 bg-green-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-green-600" />
                      <span className="font-medium">{captain2.name}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setAvailablePlayers(prev => [...prev, captain2]);
                        setCaptain2(null);
                      }}
                    >
                      Change
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="mt-2 text-sm text-gray-500">Click on a player below or use randomizer</div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-700">Available Players</Label>
          <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
            {availablePlayers.map(player => (
              <Card key={player.id} className="cursor-pointer hover:bg-gray-50">
                <CardContent className="p-3">
                  <div className="text-center">
                    <div className="text-sm font-medium">{player.name}</div>
                    <div className="flex gap-1 mt-2 justify-center">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-xs text-purple-600 hover:bg-purple-50"
                        onClick={() => selectCaptain(player, 1)}
                        disabled={captain2?.id === player.id}
                      >
                        Cap 1
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-xs text-green-600 hover:bg-green-50"
                        onClick={() => selectCaptain(player, 2)}
                        disabled={captain1?.id === player.id}
                      >
                        Cap 2
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Team Setup for the Series</h3>
        <p className="text-sm text-gray-600">Organize players into teams with your selected captains</p>
      </div>

      <div className="grid grid-cols-3 gap-4 max-h-96 overflow-y-auto">
        {/* Team 1 */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-purple-700 flex items-center gap-2">
            <Crown className="w-4 h-4" />
            {captain1?.name}'s Team
          </Label>
          <div className="space-y-2 min-h-[250px] p-3 bg-purple-50 rounded-lg border-2 border-dashed border-purple-200">
            {team1Players.map(player => (
              <Card key={player.id} className="bg-white">
                <CardContent className="p-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {player.id === captain1?.id && <Crown className="w-3 h-3 text-purple-600" />}
                      <span className="text-sm">{player.name}</span>
                    </div>
                    {player.id !== captain1?.id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => movePlayerToAvailable(player)}
                      >
                        ×
                      </Button>
                    )}
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
            {availablePlayers.map(player => (
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
            <Crown className="w-4 h-4" />
            {captain2?.name}'s Team
          </Label>
          <div className="space-y-2 min-h-[250px] p-3 bg-green-50 rounded-lg border-2 border-dashed border-green-200">
            {team2Players.map(player => (
              <Card key={player.id} className="bg-white">
                <CardContent className="p-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {player.id === captain2?.id && <Crown className="w-3 h-3 text-green-600" />}
                      <span className="text-sm">{player.name}</span>
                    </div>
                    {player.id !== captain2?.id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => movePlayerToAvailable(player)}
                      >
                        ×
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Set up Series - Step {currentStep} of 2</DialogTitle>
          <DialogDescription>
            {currentStep === 1 && "Enter series details and select captains"}
            {currentStep === 2 && "Organize players into teams for the series"}
          </DialogDescription>
        </DialogHeader>

        {isLoadingPlayers ? (
          <div className="flex justify-center py-8">
            <div className="text-gray-500">Loading players...</div>
          </div>
        ) : (
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
                  disabled={!seriesName || !captain1 || !captain2}
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleCreateSeries}
                  disabled={createSeriesMutation.isPending || team1Players.length === 0 || team2Players.length === 0}
                >
                  {createSeriesMutation.isPending ? "Creating Series..." : "Create Series & Save Teams"}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}