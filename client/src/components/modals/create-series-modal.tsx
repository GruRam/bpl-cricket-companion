import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { InsertSeries } from "@shared/schema";

interface CreateSeriesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateSeriesModal({ isOpen, onClose }: CreateSeriesModalProps) {
  const [seriesName, setSeriesName] = useState("");
  const [team1Name, setTeam1Name] = useState("");
  const [team2Name, setTeam2Name] = useState("");
  const [targetWins, setTargetWins] = useState(13);
  const { toast } = useToast();

  const createSeriesMutation = useMutation({
    mutationFn: async (data: { series: InsertSeries; team1Name: string; team2Name: string }) => {
      // Create series first
      const seriesResponse = await apiRequest("POST", "/api/series", data.series);
      const series = await seriesResponse.json();
      
      // Create teams for the series
      await apiRequest("POST", "/api/teams", {
        name: data.team1Name,
        seriesId: series.id,
        captainId: null
      });
      
      await apiRequest("POST", "/api/teams", {
        name: data.team2Name,
        seriesId: series.id,
        captainId: null
      });
      
      return series;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/series/active"] });
      toast({
        title: "Success",
        description: "Series created successfully",
      });
      handleClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create series",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!seriesName || !team1Name || !team2Name) return;

    createSeriesMutation.mutate({
      series: {
        name: seriesName,
        targetWins,
        isActive: true,
      },
      team1Name,
      team2Name,
    });
  };

  const handleClose = () => {
    setSeriesName("");
    setTeam1Name("");
    setTeam2Name("");
    setTargetWins(13);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Series</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="seriesName">Series Name</Label>
            <Input
              id="seriesName"
              value={seriesName}
              onChange={(e) => setSeriesName(e.target.value)}
              placeholder="Enter series name"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="team1">Team 1 Name</Label>
              <Input
                id="team1"
                value={team1Name}
                onChange={(e) => setTeam1Name(e.target.value)}
                placeholder="Team 1"
                required
              />
            </div>
            <div>
              <Label htmlFor="team2">Team 2 Name</Label>
              <Input
                id="team2"
                value={team2Name}
                onChange={(e) => setTeam2Name(e.target.value)}
                placeholder="Team 2"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="targetWins">Target Wins (First to win)</Label>
            <Input
              id="targetWins"
              type="number"
              value={targetWins}
              onChange={(e) => setTargetWins(parseInt(e.target.value))}
              min="1"
              max="25"
              required
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createSeriesMutation.isPending || !seriesName || !team1Name || !team2Name}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {createSeriesMutation.isPending ? "Creating..." : "Create Series"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}