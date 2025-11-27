import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { Link } from "wouter";
import { useLocation } from "wouter";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function MatchHistory() {
  const [, setLocation] = useLocation();
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>("");

  const { data: seriesList = [] } = useQuery({
    queryKey: ["/api/series"],
  });

  const { data: allMatches = [], isLoading } = useQuery({
    queryKey: ["/api/matches/all"],
  });

  const filteredMatches = selectedSeriesId
    ? allMatches.filter((m) => m.seriesId === parseInt(selectedSeriesId))
    : allMatches;

  const handleViewScorecard = (matchId: number) => {
    localStorage.setItem("viewScorecardMatchId", matchId.toString());
    setLocation("/match");
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center">Loading match history...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-foreground">Match History</h1>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-foreground">
              Filter by Series:
            </label>
            <Select value={selectedSeriesId} onValueChange={setSelectedSeriesId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="All Series" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Series</SelectItem>
                {seriesList?.map((series) => (
                  <SelectItem key={series.id} value={series.id.toString()}>
                    {series.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {filteredMatches.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No matches found
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredMatches
            .sort(
              (a, b) =>
                new Date(b.matchDate || 0).getTime() -
                new Date(a.matchDate || 0).getTime()
            )
            .map((match) => (
              <Card key={match.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-1">
                        Match #{match.id}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {new Date(match.matchDate || 0).toLocaleDateString()}
                      </p>
                      {match.isCompleted && match.winningTeamId && (
                        <p className="text-sm font-medium text-green-600 dark:text-green-400">
                          Status: Completed - Winner by{" "}
                          {match.winningTeamId === match.team1Id
                            ? "Team 1"
                            : "Team 2"}
                        </p>
                      )}
                    </div>
                    {match.isCompleted && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewScorecard(match.id)}
                        data-testid={`button-view-scorecard-history-${match.id}`}
                        className="flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Scorecard</span>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
