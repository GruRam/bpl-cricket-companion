import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { CurrentMatch } from "@/lib/types";

interface WicketDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: CurrentMatch;
}

export default function WicketDetailsModal({ isOpen, onClose, match }: WicketDetailsModalProps) {
  const [batsmanOut, setBatsmanOut] = useState("");
  const [dismissalType, setDismissalType] = useState("");
  const [fielder, setFielder] = useState("");

  const dismissalTypes = [
    "Bowled",
    "Caught",
    "LBW",
    "Run Out",
    "Stumped",
    "Hit Wicket",
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
                  <SelectItem value="fielder1">Fielder 1</SelectItem>
                  <SelectItem value="fielder2">Fielder 2</SelectItem>
                  <SelectItem value="fielder3">Fielder 3</SelectItem>
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
