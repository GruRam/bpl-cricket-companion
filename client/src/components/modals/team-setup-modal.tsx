import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Crown } from "lucide-react";

interface TeamSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TeamSetupModal({ isOpen, onClose }: TeamSetupModalProps) {
  const [team1Players, setTeam1Players] = useState([
    { id: 1, name: "Arjun Sharma", isCaptain: true },
    { id: 2, name: "Rajesh Kumar", isCaptain: false },
  ]);

  const [team2Players, setTeam2Players] = useState([
    { id: 3, name: "Vikram Patel", isCaptain: true },
    { id: 4, name: "Suresh Gupta", isCaptain: false },
  ]);

  const movePlayerToTeam2 = (playerId: number) => {
    const player = team1Players.find(p => p.id === playerId);
    if (player) {
      setTeam1Players(prev => prev.filter(p => p.id !== playerId));
      setTeam2Players(prev => [...prev, { ...player, isCaptain: false }]);
    }
  };

  const movePlayerToTeam1 = (playerId: number) => {
    const player = team2Players.find(p => p.id === playerId);
    if (player) {
      setTeam2Players(prev => prev.filter(p => p.id !== playerId));
      setTeam1Players(prev => [...prev, { ...player, isCaptain: false }]);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Team Setup</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Team 1 */}
          <div className="bg-purple-50 rounded-xl p-4">
            <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
              Team 1 - Lions
              <span className="ml-2 text-sm text-gray-600">({team1Players.length} players)</span>
            </h4>
            <div className="space-y-2">
              {team1Players.map((player) => (
                <div key={player.id} className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{player.name}</span>
                    {player.isCaptain && <Crown className="w-4 h-4 text-yellow-500" />}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => movePlayerToTeam2(player.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Team 2 */}
          <div className="bg-green-50 rounded-xl p-4">
            <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
              Team 2 - Tigers
              <span className="ml-2 text-sm text-gray-600">({team2Players.length} players)</span>
            </h4>
            <div className="space-y-2">
              {team2Players.map((player) => (
                <div key={player.id} className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => movePlayerToTeam1(player.id)}
                    className="text-green-500 hover:text-green-700"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{player.name}</span>
                    {player.isCaptain && <Crown className="w-4 h-4 text-yellow-500" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={onClose}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            Save Teams
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
