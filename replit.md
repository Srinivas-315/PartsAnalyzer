# AM Feasibility Platform - Replit.md

## Overview

This is a full-stack web application for Additive Manufacturing (AM) feasibility analysis. The platform allows customers to submit part specifications for analysis, service providers to review submissions, and administrators to manage the system. The application uses modern web technologies including React, Express.js, TypeScript, and PostgreSQL.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Components**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with custom design tokens for manufacturing theme
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for client-side routing
- **Forms**: React Hook Form with Zod validation
- **Charts**: Chart.js for data visualization (bubble charts for feasibility analysis)

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL storage
- **File Uploads**: Multer for handling multipart form data
- **API Design**: RESTful APIs with role-based access control

### Build System
- **Frontend Bundler**: Vite with React plugin
- **Backend Bundler**: esbuild for production builds
- **Development**: tsx for TypeScript execution in development
- **TypeScript**: Shared types between frontend and backend via shared directory

## Key Components

### Authentication System
- Uses Replit's OpenID Connect authentication
- URL-based access control: normal login shows customer portal, `/admin` URL shows admin portal
- Three roles: customer, service-provider, admin (stored in database but URL determines interface)
- Session persistence with PostgreSQL backend
- Protected routes with automatic redirection

### Database Schema
- **Users**: Profile information with role-based permissions
- **Materials**: AM material properties and costs
- **Machines**: AM machine specifications and capabilities
- **Submissions**: Part analysis requests with calculated results
- **Sessions**: Secure session storage

### AM Feasibility Calculator
- Technical fit scoring based on material and size compatibility
- Economic fit analysis including cost calculations
- Implementation time estimates
- Machine recommendation engine
- Comprehensive analysis results with visualizations

### File Structure
- `/client` - React frontend application
- `/server` - Express.js backend API
- `/shared` - Shared TypeScript types and schemas
- `/components.json` - shadcn/ui configuration

## Data Flow

1. **User Authentication**: Users authenticate via Replit Auth, creating/updating user records
2. **Submission Process**: Customers submit part specifications through forms
3. **Analysis Engine**: Backend calculates feasibility scores using material and machine data
4. **Results Storage**: Analysis results stored in database with status tracking
5. **Role-Based Views**: Different dashboards for customers, service providers, and admins
6. **Real-time Updates**: TanStack Query provides optimistic updates and cache management

## External Dependencies

### Core Dependencies
- **Database**: Neon PostgreSQL serverless database
- **Authentication**: Replit Auth service
- **UI Components**: Radix UI primitives
- **Validation**: Zod for runtime type checking
- **Charts**: Chart.js for data visualization

### Development Tools
- **Package Manager**: npm
- **TypeScript**: Full-stack type safety
- **ESLint/Prettier**: Code formatting and linting
- **Drizzle Kit**: Database migrations and schema management

## Deployment Strategy

### Development
- Vite dev server for frontend with HMR
- tsx for backend development with auto-reload
- PostgreSQL database provisioned via Replit

### Production
- Frontend built with Vite to static assets
- Backend bundled with esbuild for Node.js runtime
- Static assets served by Express.js
- Single server deployment model

### Environment Configuration
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key
- `REPL_ID` - Replit environment identifier
- `ISSUER_URL` - OpenID Connect issuer URL

### Build Process
1. Frontend assets built to `dist/public`
2. Backend bundled to `dist/index.js`
3. Shared types accessible to both frontend and backend
4. Database migrations applied via Drizzle Kit

The application follows a monorepo structure with clear separation between frontend, backend, and shared code, enabling efficient development and deployment in the Replit environment.