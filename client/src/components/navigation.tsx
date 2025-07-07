import { Link, useLocation } from "wouter";
import { Home, Users, Play, BarChart3 } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";

export default function Navigation() {
  const [location] = useLocation();

  const tabs = [
    { id: "home", label: "Home", icon: Home, path: "/" },
    { id: "players", label: "Players", icon: Users, path: "/players" },
    { id: "match", label: "Match", icon: Play, path: "/match" },
    { id: "stats", label: "Stats", icon: BarChart3, path: "/stats" },
  ];

  return (
    <nav className="bg-background border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
              <span className="text-white font-bold text-sm">🏏</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">BPL Scorer</h1>
              <p className="text-xs text-muted-foreground">Buddies Premier League</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = location === tab.path;
                return (
                  <Link key={tab.id} href={tab.path}>
                    <button
                      className={`tab-button px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                        isActive ? "active" : ""
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  </Link>
                );
              })}
            </div>
            <ModeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}
