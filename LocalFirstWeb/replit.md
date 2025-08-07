# Wrestling Match Management Application

## Overview

This is a local-first wrestling match management application built as a full-stack web application with Express.js backend and React frontend. The application allows users to manage team rosters, conduct weigh-ins, set up competitions, control live matches with video recording, and review match results.

## User Preferences

Preferred communication style: Simple, everyday language.

Competition weigh-in types: Individual Tournament, Single Dual, Multi Dual

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state and custom hooks for local state
- **UI Framework**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with CSS variables for theming
- **Build Tool**: Vite with development overlay for error handling

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js with ES modules
- **Database ORM**: Drizzle ORM configured for PostgreSQL
- **Session Storage**: Connect-pg-simple for PostgreSQL session store
- **Development**: Hot module replacement with Vite integration

### Database Strategy
- **Primary Database**: PostgreSQL with Neon serverless driver
- **Local Storage**: IndexedDB via IDB library for offline-first capabilities
- **Schema Management**: Drizzle-kit for migrations and schema management
- **Data Validation**: Zod schemas shared between client and server

## Key Components

### Data Models
The application uses a structured data model with the following core entities:
- **Teams**: Basic team information with roster management
- **Wrestlers**: Individual wrestler profiles linked to teams with optional weigh-in data
- **Competitions**: Event containers supporting dual meets and tournaments
- **Matches**: Individual wrestling matches with scoring and video recording
- **Event Logs**: Timestamped match events for detailed tracking

### Video Recording System
- **WebRTC Integration**: Camera access for live video recording during matches
- **Overlay Support**: Real-time score and timer overlay on recorded video
- **Local Storage**: Videos saved locally with structured folder organization
- **Match Integration**: Video recording synchronized with match timing and scoring

### Offline-First Architecture
- **IndexedDB Storage**: Local data persistence using IDB wrapper
- **Sync Strategy**: Data stored locally first, with server sync capabilities
- **Progressive Enhancement**: Application works offline with full functionality

## Data Flow

### Wrestling Data Management
1. **Roster Setup**: Teams and wrestlers created and stored locally
2. **Weigh-In Process**: Weight recording with automatic weight class assignment
3. **Competition Creation**: Multi-team events with match scheduling
4. **Live Match Control**: Real-time scoring with video recording
5. **Result Tracking**: Match completion with statistics and video storage

### State Management Flow
- Local state managed through custom hooks (useWrestlingData)
- TanStack Query handles server communication and caching
- IndexedDB provides persistent local storage
- Zod schemas ensure data validation across all layers

## External Dependencies

### UI and Styling
- **Radix UI**: Comprehensive component library for accessibility
- **Tailwind CSS**: Utility-first styling with custom design tokens
- **Lucide Icons**: Consistent iconography throughout the application

### Development Tools
- **Replit Integration**: Development environment optimization
- **TypeScript**: Type safety across frontend and backend
- **ESLint/Prettier**: Code quality and formatting (implied by structure)

### Recording and Media
- **MediaRecorder API**: Browser-native video recording
- **WebRTC**: Camera and microphone access
- **IDB**: IndexedDB wrapper for structured local storage

## Deployment Strategy

### Development Environment
- **Vite Dev Server**: Hot module replacement for frontend development
- **Express Server**: Backend API serving with middleware integration
- **Database Migrations**: Drizzle-kit for schema management
- **Environment Variables**: DATABASE_URL required for PostgreSQL connection

### Production Build
- **Frontend**: Vite builds to static assets in dist/public
- **Backend**: ESBuild bundles server code to dist/index.js
- **Database**: PostgreSQL with Neon serverless for scalability
- **Static Serving**: Express serves built frontend assets

### Local-First Considerations
- Application designed to work offline with full functionality
- Data synchronization strategy allows for eventual consistency
- Video files stored locally with structured organization
- Match data persisted locally with server backup capabilities

The architecture prioritizes user experience with offline capabilities while maintaining data integrity through proper validation and storage strategies. The wrestling-specific features are built on top of a solid foundation of modern web technologies.