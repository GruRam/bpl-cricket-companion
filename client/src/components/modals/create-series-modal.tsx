import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, Users, ArrowRight, ArrowLeft } from "lucide-react";
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

  // Initialize team setup when moving to step 2
  const initializeTeamSetup = () => {
    if (captain1 && captain2) {
      const remaining = allPlayers.filter(p => p.id !== captain1.id && p.id !== captain2.id);
      setAvailablePlayers(remaining);
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
        isActive: true,
        status: "active"
      };
      
      const seriesResponse = await apiRequest("POST", "/api/series", seriesData);
      const series = await seriesResponse.json();
      
      // Create teams with captains
      await apiRequest("POST", "/api/teams", {
        name: `${captain1?.name}'s Team`,
        seriesId: series.id,
        captainId: captain1?.id
      });
      
      await apiRequest("POST", "/api/teams", {
        name: `${captain2?.name}'s Team`,
        seriesId: series.id,
        captainId: captain2?.id
      });
      
      return series;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/series/active"] });
      toast({
        title: "Series Created",
        description: "Your new series has been created successfully!",
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
    setAvailablePlayers([]);
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
        <h3 className="text-lg font-semibold">Select Captains</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium text-purple-700">Captain 1</Label>
            <div className="grid grid-cols-1 gap-2 mt-2">
              {allPlayers.map(player => (
                <Card 
                  key={player.id} 
                  className={`cursor-pointer transition-all ${
                    captain1?.id === player.id 
                      ? 'ring-2 ring-purple-500 bg-purple-50' 
                      : captain2?.id === player.id 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    if (captain2?.id !== player.id) {
                      setCaptain1(player);
                    }
                  }}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      {captain1?.id === player.id && <Crown className="w-4 h-4 text-purple-600" />}
                      <span className="text-sm">{player.name}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-green-700">Captain 2</Label>
            <div className="grid grid-cols-1 gap-2 mt-2">
              {allPlayers.map(player => (
                <Card 
                  key={player.id} 
                  className={`cursor-pointer transition-all ${
                    captain2?.id === player.id 
                      ? 'ring-2 ring-green-500 bg-green-50' 
                      : captain1?.id === player.id 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    if (captain1?.id !== player.id) {
                      setCaptain2(player);
                    }
                  }}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      {captain2?.id === player.id && <Crown className="w-4 h-4 text-green-600" />}
                      <span className="text-sm">{player.name}</span>
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
        <h3 className="text-lg font-semibold">Set Up Teams</h3>
        <p className="text-sm text-gray-600">Organize players into teams with your selected captains</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Team 1 */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-purple-700 flex items-center gap-2">
            <Crown className="w-4 h-4" />
            {captain1?.name}'s Team
          </Label>
          <div className="space-y-2 min-h-[200px] p-3 bg-purple-50 rounded-lg">
            {team1Players.map(player => (
              <Card key={player.id} className="bg-white">
                <CardContent className="p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{player.name}</span>
                    {player.id === captain1?.id && <Crown className="w-3 h-3 text-purple-600" />}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Available Players */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Available Players
          </Label>
          <div className="space-y-2 min-h-[200px] p-3 bg-gray-50 rounded-lg">
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
        <div className="space-y-2">
          <Label className="text-sm font-medium text-green-700 flex items-center gap-2">
            <Crown className="w-4 h-4" />
            {captain2?.name}'s Team
          </Label>
          <div className="space-y-2 min-h-[200px] p-3 bg-green-50 rounded-lg">
            {team2Players.map(player => (
              <Card key={player.id} className="bg-white">
                <CardContent className="p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{player.name}</span>
                    {player.id === captain2?.id && <Crown className="w-3 h-3 text-green-600" />}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6 text-center">
      <div>
        <h3 className="text-lg font-semibold">Ready to Start!</h3>
        <p className="text-sm text-gray-600">Your series is ready to be created</p>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium">{seriesName}</h4>
          <p className="text-sm text-gray-600">First to {targetWins} wins</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-purple-50 rounded-lg">
            <div className="flex items-center gap-2 justify-center mb-2">
              <Crown className="w-4 h-4 text-purple-600" />
              <span className="font-medium text-purple-700">{captain1?.name}'s Team</span>
            </div>
            <div className="text-sm text-gray-600">
              {team1Players.length} players
            </div>
          </div>

          <div className="p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 justify-center mb-2">
              <Crown className="w-4 h-4 text-green-600" />
              <span className="font-medium text-green-700">{captain2?.name}'s Team</span>
            </div>
            <div className="text-sm text-gray-600">
              {team2Players.length} players
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Create New Series - Step {currentStep} of 3</DialogTitle>
          <DialogDescription>
            {currentStep === 1 && "Set up your series details and select captains"}
            {currentStep === 2 && "Organize players into teams"}
            {currentStep === 3 && "Review and create your series"}
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
            {currentStep === 3 && renderStep3()}

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={handlePrevStep}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              {currentStep < 3 ? (
                <Button
                  onClick={handleNextStep}
                  disabled={
                    (currentStep === 1 && (!seriesName || !captain1 || !captain2)) ||
                    (currentStep === 2 && (team1Players.length === 0 || team2Players.length === 0))
                  }
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleCreateSeries}
                  disabled={createSeriesMutation.isPending}
                >
                  {createSeriesMutation.isPending ? "Creating..." : "Create Series"}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}