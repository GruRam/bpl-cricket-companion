import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, User, Edit2, Check, X } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import AddPlayerModal from "@/components/modals/add-player-modal";
import { useToast } from "@/hooks/use-toast";
import type { Player } from "@shared/schema";

export default function Players() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const { toast } = useToast();

  const { data: players, isLoading } = useQuery({
    queryKey: ["/api/players"],
  });

  const updatePlayerMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const response = await apiRequest("PUT", `/api/players/${id}`, { name });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      toast({
        title: "Success",
        description: "Player updated successfully",
      });
      setEditingPlayer(null);
      setEditName("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update player",
        variant: "destructive",
      });
    },
  });

  const startEdit = (player: Player) => {
    setEditingPlayer(player.id);
    setEditName(player.name);
  };

  const cancelEdit = () => {
    setEditingPlayer(null);
    setEditName("");
  };

  const saveEdit = () => {
    if (editingPlayer && editName.trim()) {
      updatePlayerMutation.mutate({ id: editingPlayer, name: editName.trim() });
    }
  };

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
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 ${getAvatarColor(index)} rounded-full flex items-center justify-center text-white font-semibold`}>
                      {getInitials(player.name)}
                    </div>
                    <div className="flex-1">
                      {editingPlayer === player.id ? (
                        <div className="flex items-center space-x-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-8"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit();
                              if (e.key === 'Escape') cancelEdit();
                            }}
                          />
                          <Button size="sm" onClick={saveEdit} className="h-8 w-8 p-0">
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit} className="h-8 w-8 p-0">
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <h3 className="font-semibold text-gray-800">{player.name}</h3>
                      )}
                    </div>
                  </div>
                  {editingPlayer !== player.id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEdit(player)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  )}
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
