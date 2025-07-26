# Sistema de Gerenciamento - User Management System

## Overview

This is a full-stack web application built with React (frontend) and Express.js (backend) that provides a comprehensive user management system with credit tracking capabilities. The application features role-based access control with admin functionality and integrates with Replit's authentication system.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Framework**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit OIDC integration with Passport.js
- **Session Management**: Express sessions with PostgreSQL storage
- **Database Connection**: Neon serverless PostgreSQL

## Key Components

### Authentication System
- **Provider**: Replit OIDC for user authentication
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **Role-based Access**: Admin and regular user roles with middleware protection
- **User Profile**: Automatic user creation/update on login with profile information

### Database Schema
- **Users Table**: Stores user profiles, roles, credits, and status information
- **Credit Transactions Table**: Tracks all credit-related operations with audit trail
- **Sessions Table**: Manages user session data (required for Replit Auth)
- **Enums**: User roles (admin/regular) and status (active/blocked)

### User Management Features
- **Admin Dashboard**: Comprehensive interface for managing users
- **Credit Management**: Add/subtract credits with transaction history
- **User Blocking**: Ability to block/unblock user accounts
- **Search & Filter**: Find users by name or email
- **Statistics**: Overview of user metrics and credit totals

### API Structure
- **Authentication Routes**: Login, logout, user profile endpoints
- **User Management**: CRUD operations for user data (admin only)
- **Credit Operations**: Credit updates and transaction history
- **Statistics**: Aggregated user and credit data

## Data Flow

1. **Authentication Flow**:
   - User initiates login via Replit OIDC
   - Backend validates and creates/updates user profile
   - Session established with PostgreSQL storage
   - Role-based routing on frontend

2. **Admin Operations**:
   - Admin authentication verified via middleware
   - CRUD operations on user data through REST API
   - Real-time updates via React Query invalidation
   - Toast notifications for user feedback

3. **Credit Management**:
   - Credit transactions recorded with admin audit trail
   - Balance updates with transaction history
   - Credit limits enforced at application level

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL connection for serverless environments
- **drizzle-orm**: Type-safe database ORM with PostgreSQL dialect
- **passport**: Authentication middleware for Express
- **express-session**: Session management with PostgreSQL store
- **@tanstack/react-query**: Server state management for React

### UI Dependencies
- **@radix-ui/react-***: Accessible UI component primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **lucide-react**: Icon library

### Development Tools
- **vite**: Fast build tool and development server
- **typescript**: Type safety across the application
- **drizzle-kit**: Database migration and schema management

## Deployment Strategy

### Development Environment
- **Replit Integration**: Optimized for Replit development environment
- **Hot Reload**: Vite development server with HMR
- **Database**: Neon PostgreSQL for development and production

### Production Build
- **Frontend**: Vite builds static assets to `dist/public`
- **Backend**: ESBuild bundles server code for Node.js execution
- **Database**: Drizzle migrations for schema deployment
- **Environment Variables**: DATABASE_URL, SESSION_SECRET, REPLIT_DOMAINS required

### Key Configuration Files
- **drizzle.config.ts**: Database migration configuration
- **vite.config.ts**: Frontend build configuration with path aliases
- **tsconfig.json**: TypeScript configuration for monorepo structure
- **tailwind.config.ts**: Styling configuration with CSS variables

### Security Considerations
- **HTTPS Only**: Secure cookies and session management
- **CSRF Protection**: Express session configuration
- **Role Validation**: Server-side middleware for admin operations
- **Input Validation**: Zod schemas for API request validation

The application follows a clean separation of concerns with shared TypeScript types between frontend and backend, comprehensive error handling, and a responsive design optimized for both desktop and mobile use.