# Cricket Scorer Web Application

## Overview

This is a full-stack cricket scoring application for real-time scoring, comprehensive match management, player statistics tracking, and an intuitive user interface. Its purpose is to provide an engaging platform for cricket enthusiasts to manage and score matches, track player performance, and follow series progression.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query (React Query)
- **UI**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS
- **Build Tool**: Vite

### Backend
- **Runtime**: Node.js with Express.js REST API
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)

### Full-Stack Integration
- **Monorepo**: Shared TypeScript schemas for client and server
- **Type Safety**: End-to-end type safety
- **Development Server**: Integrated Vite dev server with Express API proxy

### Key Features & Design Choices
- **Real-time Scoring**: Ball-by-ball entry with runs, wickets, and extras tracking, real-time score updates, and automatic statistics calculation.
- **Match Management**: Series creation, team setup, player assignments, and comprehensive match setup flows.
- **Player & Team Statistics**: Tracking of individual player and team performance metrics, including batting statistics, bowling figures, and match outcomes.
- **User Interface**: Intuitive dashboard, player management, match scoring interface, and detailed statistics views. Includes dark mode and mobile responsiveness.
- **Game Flow Controls**: Mandatory bowler changes, new batter selection after wickets, and disabled ball entry buttons until required actions are taken.
- **Innings Transitions**: Comprehensive persistence with automatic saving, "Resume Match" functionality, and smooth transitions between first and second innings.
- **Scorecard**: Professional scorecard layout displaying batting and bowling statistics, dismissal information, and innings separation.
- **Over Progress Visualization**: Tennis ball icons with color-coding for runs, wickets, and extras, and a pulsating indicator for the next legitimate ball.
- **Database Integration**: Matches, players, balls, and statistics are persisted in PostgreSQL, ensuring data integrity and real-time stat updates.

## External Dependencies

- **@neondatabase/serverless**: Serverless PostgreSQL connection
- **drizzle-orm**: Type-safe database operations
- **@tanstack/react-query**: Server state management
- **wouter**: Lightweight React routing
- **@radix-ui/***: Headless UI components
- **tailwindcss**: Utility-first CSS framework
- **vite**: Fast build tool and dev server
- **typescript**: Type safety
- **@replit/vite-plugin-***: Replit-specific development tools