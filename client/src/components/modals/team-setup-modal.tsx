import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, Users, ArrowRight, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Player } from "@shared/schema";

interface TeamSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TeamSetupModal({ isOpen, onClose }: TeamSetupModalProps) {
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
    onSuccess: (players) => {
      setAvailablePlayers(players);
    }
  });

  // Select captain and initialize team
  const selectCaptain = (player: Player, teamNumber: 1 | 2) => {
    if (teamNumber === 1) {
      // Remove from captain 2 if selected there
      if (captain2?.id === player.id) {
        setCaptain2(null);
        setTeam2Players(prev => prev.filter(p => p.id !== player.id));
      }
      setCaptain1(player);
      setTeam1Players([player]);
    } else {
      // Remove from captain 1 if selected there
      if (captain1?.id === player.id) {
        setCaptain1(null);
        setTeam1Players(prev => prev.filter(p => p.id !== player.id));
      }
      setCaptain2(player);
      setTeam2Players([player]);
    }
    
    // Remove from available players
    setAvailablePlayers(prev => prev.filter(p => p.id !== player.id));
  };

  // Move player to team
  const movePlayerToTeam = (player: Player, teamNumber: 1 | 2) => {
    if (teamNumber === 1) {
      setTeam2Players(prev => prev.filter(p => p.id !== player.id));
      setAvailablePlayers(prev => prev.filter(p => p.id !== player.id));
      setTeam1Players(prev => [...prev, player]);
    } else {
      setTeam1Players(prev => prev.filter(p => p.id !== player.id));
      setAvailablePlayers(prev => prev.filter(p => p.id !== player.id));
      setTeam2Players(prev => [...prev, player]);
    }
  };

  // Save teams
  const saveTeams = () => {
    if (!captain1 || !captain2) {
      toast({
        title: "Error",
        description: "Please select both captains before saving teams.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Teams Saved",
      description: "Team setup has been saved successfully!",
    });
    onClose();
  };

  const handleClose = () => {
    // Reset everything
    setCaptain1(null);
    setCaptain2(null);
    setTeam1Players([]);
    setTeam2Players([]);
    setAvailablePlayers(allPlayers);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>Team Setup</DialogTitle>
          <DialogDescription>
            Select captains and organize players into two teams
          </DialogDescription>
        </DialogHeader>

        {isLoadingPlayers ? (
          <div className="flex justify-center py-8">
            <div className="text-gray-500">Loading players...</div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Captain Selection */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-purple-700 flex items-center gap-2">
                  <Crown className="w-5 h-5" />
                  Select Captain 1
                </h3>
                {captain1 ? (
                  <Card className="border-purple-200 bg-purple-50">
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
                            setCaptain1(null);
                            setTeam1Players([]);
                            setAvailablePlayers(prev => [...prev, captain1]);
                          }}
                        >
                          Change
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-sm text-gray-500">Click on a player below to select as captain</div>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-green-700 flex items-center gap-2">
                  <Crown className="w-5 h-5" />
                  Select Captain 2
                </h3>
                {captain2 ? (
                  <Card className="border-green-200 bg-green-50">
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
                            setCaptain2(null);
                            setTeam2Players([]);
                            setAvailablePlayers(prev => [...prev, captain2]);
                          }}
                        >
                          Change
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-sm text-gray-500">Click on a player below to select as captain</div>
                )}
              </div>
            </div>

            {/* Team Setup */}
            <div className="grid grid-cols-3 gap-4">
              {/* Team 1 */}
              <div className="space-y-3">
                <h4 className="font-semibold text-purple-700 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {captain1?.name ? `${captain1.name}'s Team` : "Team 1"}
                </h4>
                <div className="min-h-[300px] p-4 bg-purple-50 rounded-lg border-2 border-dashed border-purple-200">
                  <div className="space-y-2">
                    {team1Players.map(player => (
                      <Card key={player.id} className="bg-white">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {player.id === captain1?.id && <Crown className="w-3 h-3 text-purple-600" />}
                              <span className="text-sm font-medium">{player.name}</span>
                            </div>
                            {player.id !== captain1?.id && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  setTeam1Players(prev => prev.filter(p => p.id !== player.id));
                                  setAvailablePlayers(prev => [...prev, player]);
                                }}
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

              {/* Available Players */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Available Players
                </h4>
                <div className="min-h-[300px] p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <div className="space-y-2">
                    {availablePlayers.map(player => (
                      <Card key={player.id} className="bg-white hover:bg-gray-50 cursor-pointer">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{player.name}</span>
                            <div className="flex gap-1">
                              {!captain1 ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-xs text-purple-600 hover:bg-purple-50"
                                  onClick={() => selectCaptain(player, 1)}
                                >
                                  <Crown className="w-3 h-3" />
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 w-6 p-0 text-purple-600 hover:bg-purple-50"
                                  onClick={() => movePlayerToTeam(player, 1)}
                                >
                                  <ArrowLeft className="w-3 h-3" />
                                </Button>
                              )}
                              
                              {!captain2 ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-xs text-green-600 hover:bg-green-50"
                                  onClick={() => selectCaptain(player, 2)}
                                >
                                  <Crown className="w-3 h-3" />
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 w-6 p-0 text-green-600 hover:bg-green-50"
                                  onClick={() => movePlayerToTeam(player, 2)}
                                >
                                  <ArrowRight className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>

              {/* Team 2 */}
              <div className="space-y-3">
                <h4 className="font-semibold text-green-700 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {captain2?.name ? `${captain2.name}'s Team` : "Team 2"}
                </h4>
                <div className="min-h-[300px] p-4 bg-green-50 rounded-lg border-2 border-dashed border-green-200">
                  <div className="space-y-2">
                    {team2Players.map(player => (
                      <Card key={player.id} className="bg-white">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {player.id === captain2?.id && <Crown className="w-3 h-3 text-green-600" />}
                              <span className="text-sm font-medium">{player.name}</span>
                            </div>
                            {player.id !== captain2?.id && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  setTeam2Players(prev => prev.filter(p => p.id !== player.id));
                                  setAvailablePlayers(prev => [...prev, player]);
                                }}
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

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={saveTeams} disabled={!captain1 || !captain2}>
                Save Teams
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}