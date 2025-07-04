import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, User } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import AddPlayerModal from "@/components/modals/add-player-modal";
import type { Player } from "@shared/schema";

export default function Players() {
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: players, isLoading } = useQuery({
    queryKey: ["/api/players"],
  });

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getAvatarColor = (index: number) => {
    const colors = ['bg-purple-500', 'bg-green-500', 'bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-pink-500'];
    return colors[index % colors.length];
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-24 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Player Roster</h2>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Player
        </Button>
      </div>

      {players && players.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {players.map((player: Player, index: number) => (
            <Card key={player.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className={`w-12 h-12 ${getAvatarColor(index)} rounded-full flex items-center justify-center text-white font-semibold`}>
                    {getInitials(player.name)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{player.name}</h3>
                    <p className="text-sm text-gray-600">{player.position}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">Matches</div>
                    <div className="font-semibold">0</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Runs</div>
                    <div className="font-semibold">0</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Wickets</div>
                    <div className="font-semibold">0</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Catches</div>
                    <div className="font-semibold">0</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No Players Yet</h3>
          <p className="text-gray-600 mb-6">Add players to your roster to get started</p>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add First Player
          </Button>
        </div>
      )}

      <AddPlayerModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </div>
  );
}
