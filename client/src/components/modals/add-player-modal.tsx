import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { InsertPlayer } from "@shared/schema";

interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddPlayerModal({ isOpen, onClose }: AddPlayerModalProps) {
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const { toast } = useToast();

  const addPlayerMutation = useMutation({
    mutationFn: async (player: InsertPlayer) => {
      const response = await apiRequest("POST", "/api/players", player);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      toast({
        title: "Success",
        description: "Player added successfully",
      });
      handleClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add player",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !position) return;

    addPlayerMutation.mutate({
      name,
      position,
      isActive: true,
    });
  };

  const handleClose = () => {
    setName("");
    setPosition("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Player</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Player Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter player name"
              required
            />
          </div>
          <div>
            <Label>Position</Label>
            <Select value={position} onValueChange={setPosition}>
              <SelectTrigger>
                <SelectValue placeholder="Select position" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Batsman">Batsman</SelectItem>
                <SelectItem value="Bowler">Bowler</SelectItem>
                <SelectItem value="All-Rounder">All-Rounder</SelectItem>
                <SelectItem value="Wicket-Keeper">Wicket-Keeper</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={addPlayerMutation.isPending || !name || !position}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {addPlayerMutation.isPending ? "Adding..." : "Add Player"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
