# Music Review Platform

## Overview

This is a full-stack music review platform that allows users to discover, rate, and discuss music releases. The application features a comprehensive music database where users can browse albums, submit ratings, write reviews, and engage with the community through comments and reactions. The platform supports user authentication, content moderation, and administrative functions for managing releases and reports.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: Radix UI primitives with shadcn/ui component system
- **Styling**: Tailwind CSS with CSS variables for theming and dark mode support
- **Authentication Flow**: OAuth integration with session-based authentication

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API endpoints with JSON responses
- **Authentication**: Replit Auth with OpenID Connect (OIDC) for OAuth authentication
- **Session Management**: Express sessions with PostgreSQL session store
- **Middleware**: Request logging, error handling, and authentication middleware

### Database Architecture
- **Primary Database**: PostgreSQL with Neon serverless driver
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Design**: 
  - Users table with OAuth profile data and nickname system
  - Artists and Releases with relational structure
  - Ratings system with user-release relationships
  - Comments with threading support and reactions
  - Reports system for content moderation
  - Sessions table for authentication persistence

### Authentication & Authorization
- **Provider**: Google OAuth via Replit Auth
- **Session Storage**: PostgreSQL-backed sessions with configurable TTL
- **User Management**: Profile creation with nickname requirement
- **Admin System**: Role-based access control for administrative functions
- **Security**: HTTP-only cookies, CSRF protection, and secure session configuration

### Content Management
- **Rating System**: 1-10 scale rating system with aggregated averages
- **Comment System**: Threaded comments with like/dislike reactions
- **Moderation**: User reporting system with admin review interface
- **Search**: Full-text search across releases and artists
- **Admin Panel**: CRUD operations for releases, user management, and report handling

## External Dependencies

### Core Infrastructure
- **Database**: Neon PostgreSQL serverless database
- **Authentication**: Replit Auth with Google OAuth provider
- **Hosting**: Replit platform with integrated development environment

### Frontend Libraries
- **UI Framework**: Radix UI component primitives
- **Data Fetching**: TanStack Query for API state management
- **Styling**: Tailwind CSS with PostCSS processing
- **Icons**: Lucide React icon library
- **Date Handling**: date-fns for date formatting and manipulation
- **Form Handling**: React Hook Form with Zod validation

### Backend Libraries
- **Database**: Drizzle ORM with PostgreSQL adapter
- **Authentication**: Passport.js with OpenID Connect strategy
- **Session Management**: express-session with connect-pg-simple
- **Validation**: Zod for runtime type validation
- **Development**: tsx for TypeScript execution, esbuild for production builds

### Development Tools
- **Build System**: Vite for frontend, esbuild for backend
- **Type Checking**: TypeScript with strict configuration
- **Code Quality**: ESLint and Prettier (configured via shadcn/ui)
- **Development Server**: Hot module replacement with Vite middleware
- **Debugging**: Replit-specific development tools and error overlay