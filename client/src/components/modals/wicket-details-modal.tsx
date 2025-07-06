import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { CurrentMatch } from "@/lib/types";
import type { Player } from "@shared/schema";

interface WicketDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: CurrentMatch;
}

export default function WicketDetailsModal({ isOpen, onClose, match }: WicketDetailsModalProps) {
  const [batsmanOut, setBatsmanOut] = useState("");
  const [dismissalType, setDismissalType] = useState("");
  const [fielder, setFielder] = useState("");

  // Get bowling team players for fielder dropdown
  const { data: bowlingPlayers = [] } = useQuery<Player[]>({
    queryKey: ["/api/teams", match.bowlingTeam.id, "players"],
    select: (data: any) => data.map((tp: any) => tp.player).sort((a: Player, b: Player) => a.name.localeCompare(b.name)),
    enabled: isOpen && !!match.bowlingTeam.id,
  });

  const dismissalTypes = [
    "Bowled",
    "Caught",
    "Run Out",
    "Stumped", 
    "Hit Wicket",
    "Boundary Out",
  ];

  const fielderRequired = dismissalType === "Caught" || dismissalType === "Run Out" || dismissalType === "Stumped";

  const handleSubmit = () => {
    if (!batsmanOut || !dismissalType || (fielderRequired && !fielder)) return;

    // TODO: Implement wicket recording logic
    console.log("Wicket recorded:", {
      batsmanOut,
      dismissalType,
      fielder: fielderRequired ? fielder : null,
    });

    // Reset form
    setBatsmanOut("");
    setDismissalType("");
    setFielder("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Wicket Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Batsman Out</Label>
            <Select value={batsmanOut} onValueChange={setBatsmanOut}>
              <SelectTrigger>
                <SelectValue placeholder="Select batsman" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="striker">{match.striker.name}</SelectItem>
                <SelectItem value="non-striker">{match.nonStriker.name}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Dismissal Type</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {dismissalTypes.map((type) => (
                <Button
                  key={type}
                  variant={dismissalType === type ? "default" : "outline"}
                  onClick={() => setDismissalType(type)}
                  className={`text-sm ${
                    dismissalType === type
                      ? "bg-purple-600 hover:bg-purple-700"
                      : ""
                  }`}
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          {fielderRequired && (
            <div>
              <Label>Fielder</Label>
              <Select value={fielder} onValueChange={setFielder}>
                <SelectTrigger>
                  <SelectValue placeholder="Select fielder" />
                </SelectTrigger>
                <SelectContent>
                  {bowlingPlayers.map(player => (
                    <SelectItem key={player.id} value={player.id.toString()}>
                      {player.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!batsmanOut || !dismissalType || (fielderRequired && !fielder)}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Record Wicket
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
