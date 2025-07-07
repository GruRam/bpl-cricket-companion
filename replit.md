# Cricket Scorer Web Application

## Overview

This is a full-stack cricket scoring application built using modern web technologies. The application provides real-time scoring capabilities with comprehensive match management, player statistics tracking, and an intuitive user interface designed for cricket enthusiasts.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Framework**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Runtime**: Node.js with Express.js REST API
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **API Pattern**: RESTful endpoints with proper error handling
- **Development**: Hot module replacement with Vite integration

### Full-Stack Integration
- **Monorepo Structure**: Shared TypeScript schemas between client and server
- **Type Safety**: End-to-end type safety with shared interfaces
- **Development Server**: Integrated Vite dev server with Express API proxy

## Key Components

### Database Schema
- **Players**: Core player information with positions (All-Rounder, Batsman, Bowler)
- **Series**: Tournament structure with configurable win targets
- **Teams**: Team management with captain assignments
- **Matches**: Match tracking with innings, overs, and detailed ball-by-ball scoring
- **Statistics**: Comprehensive player and team performance metrics

### API Endpoints
- **Players**: CRUD operations for player management
- **Series**: Active series tracking and management
- **Teams**: Team composition and player assignments
- **Matches**: Real-time match scoring and statistics
- **Statistics**: Aggregated performance data

### User Interface
- **Dashboard**: Series overview and quick match access
- **Player Management**: Add, edit, and organize player rosters
- **Match Scoring**: Real-time ball-by-ball scoring interface
- **Statistics**: Detailed performance analytics and insights

## Data Flow

### Match Scoring Flow
1. Match setup with team selection and player assignments
2. Ball-by-ball entry with runs, wickets, and extras tracking
3. Real-time score updates and over progression
4. Automatic statistics calculation and storage
5. Match completion and series progression tracking

### Database Operations
1. Drizzle ORM handles all database interactions
2. Connection pooling via Neon's serverless PostgreSQL
3. Automatic schema migrations and type generation
4. Optimistic updates with React Query caching

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL connection
- **drizzle-orm**: Type-safe database operations
- **@tanstack/react-query**: Server state management
- **wouter**: Lightweight React routing
- **@radix-ui/***: Headless UI components
- **tailwindcss**: Utility-first CSS framework

### Development Dependencies
- **vite**: Fast build tool and dev server
- **typescript**: Type safety and developer experience
- **@replit/vite-plugin-***: Replit-specific development tools

## Deployment Strategy

### Production Build
- **Frontend**: Vite builds optimized static assets to `dist/public`
- **Backend**: esbuild bundles server code to `dist/index.js`
- **Database**: Drizzle migrations applied via `db:push` command

### Environment Configuration
- **Development**: `npm run dev` starts both frontend and backend
- **Production**: `npm run build` then `npm start`
- **Database**: Requires `DATABASE_URL` environment variable

### Hosting Requirements
- Node.js runtime environment
- PostgreSQL database (Neon recommended)
- Static file serving for frontend assets
- Environment variable configuration

## User Preferences

Preferred communication style: Simple, everyday language.

## Changelog

```
Changelog:
- July 04, 2025. Initial setup
- July 04, 2025. Enhanced cricket scoring app with:
  * Updated navigation tabs with cleaner styling
  * Added series creation functionality with team setup
  * Removed position field from players (name only)
  * Added player name editing capability
  * Simplified match setup to use series team names
  * Enhanced ball-by-ball scorer with player selection dropdowns
  * Added ball editing/deletion functionality
  * Improved quick entry buttons with all run options (0-6)
  * Added batsman swap functionality
  * Integrated bowler selection for each over

- July 06, 2025. Major workflow improvements:
  * Removed series name requirement - auto-generates from captains
  * Added captain randomizer with manual selection option
  * Implemented comprehensive match setup modal with 3 steps:
    - Basic settings (overs per side, first batting team)
    - Team customization with player status options:
      * Switch teams
      * Make common player (plays for both teams)
      * Mark unavailable for match
    - Final setup (striker, non-striker, bowler selection)
  * Enhanced wicket modal with contextual player dropdowns
  * Removed LBW, added Boundary Out dismissal type
  * Added active series context display on match page
  * Fixed infinite API call loops
  * Team names always reflect captain names (no editing)
  * Common player concept: match wins for either team, series wins only for original team

- July 06, 2025. Match state persistence and extras handling:
  * Added automatic match state saving during scoring
  * Resume prompt when returning to ongoing match
  * Excluded dismissed and unavailable players from striker/non-striker dropdowns
  * Improved wide/no-ball handling:
    - WD/NB display correctly in over progress
    - No-ball allows additional runs (0-6) on top of extra
    - Ball counting uses decimal notation (0.1, 0.2) for extras
    - Wide balls allow dismissals (run out/stumped)
    - No-ball allows dismissals (run out) plus additional runs

- July 07, 2025. Dark mode and app branding:
  * Added dark mode toggle with system preference detection
  * Implemented theme provider with local storage persistence
  * Updated app name to "BPL Scorer (Buddies Premier League)"
  * Enhanced navigation with app branding and theme toggle
  * Added striker/non-striker swap functionality with rotate button
  * Updated overs per side options to: 2, 6, 7, 8, 9, 10, 12, 20 (2 overs added for testing)
  * Run out dismissals now include runs scored (0-4) before wicket
  * Improved ball counting logic for proper cricket rules
  * Fixed all hard-coded text colors across entire app for proper dark mode support
  * Replaced text-gray classes with theme-aware text-foreground and text-muted-foreground
  * Enhanced common player handling in ball-by-ball scoring:
    - Common players included in both teams' available player lists
    - Prevents common players from batting and bowling simultaneously
    - Auto-handles bowler changes when common player switches roles
    - Special logic for when only common player remains for batting
    - Common players now appear in fielder dropdowns for dismissals
  * Implemented compulsory game flow controls:
    - Bowler change mandatory after each over completion
    - New batter selection mandatory after wickets before proceeding
    - All ball entry buttons disabled until required changes are made
    - Prominent red alert cards with "Done" buttons positioned near ball-by-ball tracking
    - Clear visual feedback showing required actions before proceeding
  * Added single batting mode functionality:
    - Automatically detects when only one batter remains
    - Remaining batter stays on strike regardless of runs scored
    - Visual indicator shows when single batting mode is active
    - Batsman rotation disabled in single batting scenarios
  * Enhanced over progress visualization:
    - Replaced confusing number display with tennis ball icons
    - Color-coded balls: Yellow (next), Blue (runs), Green (boundary), Gray (dot), Red (wicket), Orange (extras)
    - Clear runs description below each completed ball
    - Tennis ball texture lines for visual appeal
    - Color legend for easy understanding
    - Always shows 6 legitimate ball slots by default (empty gray balls)
    - Fills balls chronologically as bowled, including extras mixed with regular balls
    - When extras occur, shows them chronologically but maintains 6 legitimate ball positions
    - Extra balls (WD/NB) shown in orange with clear labels like "WD" or "NB+1"
    - Next legitimate ball slot pulses yellow to indicate which ball is next
```