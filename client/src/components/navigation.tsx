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
    <>
      {/* Desktop Navigation - Hidden on mobile */}
      <nav className="hidden md:block bg-background border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">🏏</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">
                  BPL Scorer
                </h1>
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

      {/* Mobile Top Bar - Compact header */}
      <div className="md:hidden bg-background border-b border-border sticky top-0 z-50">
        <div className="flex justify-between items-center h-14 px-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-white font-bold">🏏</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-foreground">BPL Scorer</h1>
            </div>
          </div>
          <ModeToggle />
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border pb-safe">
        <div className="flex w-full h-16">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = location === tab.path;
            return (
              <Link key={tab.id} href={tab.path} className="flex-1">
                <button
                  data-testid={`nav-${tab.id}`}
                  className={`flex flex-col items-center justify-center h-16 w-full transition-colors ${
                    isActive 
                      ? "text-purple-600 dark:text-purple-400" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className={`w-6 h-6 ${isActive ? "mb-0.5" : ""}`} />
                  <span className="text-xs mt-1 font-medium">{tab.label}</span>
                </button>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
