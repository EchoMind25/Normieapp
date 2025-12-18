# Normie Companion App

## Overview

A real-time companion web application for the $NORMIE memecoin on Solana. The app provides live token metrics tracking, a meme generator for community engagement, community polls, and social links. Built with a 4chan-inspired dark terminal aesthetic featuring green accents and monospace typography.

**Key Features:**
- Real-time dashboard with live price, market cap, volume, and holder metrics
- Token supply tracking including burned and locked tokens
- Price charts with dev buy transaction markers
- Interactive meme generator with templates and stickers
- Community polls and activity feed
- Social media integration (Telegram, X/Twitter)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state, React hooks for local state
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Charts**: Chart.js with react-chartjs-2 for price/volume visualization

**Design Pattern**: Component-based architecture with:
- `/pages` - Route-level components (Home, NotFound)
- `/components` - Feature components (Dashboard, MemeGenerator, CommunityHub)
- `/components/ui` - Reusable UI primitives from shadcn
- `/hooks` - Custom React hooks (useWebSocket, useTheme, useMobile)
- `/lib` - Utilities and query client configuration

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Pattern**: REST endpoints under `/api/*`
- **Build Tool**: Vite for development with HMR, esbuild for production bundling

**Key Endpoints:**
- `GET /api/metrics` - Current token metrics
- `GET /api/price-history` - Historical price data for charts
- `GET /api/dev-buys` - Dev wallet transaction history
- `GET /api/connection-status` - Solana RPC connection health

### Data Layer
- **Database**: PostgreSQL with Drizzle ORM (schema in `/shared/schema.ts`)
- **Real-time Updates**: HTTP polling every 5 seconds from client, backend caches Solana RPC responses
- **Fallback Data**: Hardcoded fallback metrics when RPC is unavailable

### Solana Integration
- **RPC Endpoint**: Public node at `https://solana-rpc.publicnode.com`
- **Token Address**: `FrSFwE2BxWADEyUWFXDMAeomzuB4r83ZvzdG9sevpump`
- **Library**: @solana/web3.js for blockchain queries
- **Data Fetched**: Token account info, supply metrics, transaction history

### Build & Deployment
- **Development**: `npm run dev` - Vite dev server with Express backend
- **Production Build**: `npm run build` - Compiles client with Vite, bundles server with esbuild
- **Database Migrations**: Drizzle Kit with `npm run db:push`
- **Health Check**: `GET /api/health` - Validates database connectivity, tables, polls, and admin user

### Production Hardening (December 2025)
- **Database Connection**: Retry logic with 3 attempts, environment-aware logging (DEVELOPMENT/PRODUCTION mode)
- **Startup Verification**: Checks all 18 required tables exist before accepting requests
- **Error Handling**: Request-scoped logging with correlation IDs for poll and database operations
- **Sticker Proxy**: 2-retry bounded retries, 5MB size guards, in-memory caching, detailed error diagnostics
- **Seed Data**: 6 sample community polls seeded automatically (idempotent execution)
- **Admin Account**: Default password "NormieAdmin2024!" unless NORMIE_ADMIN_PASSWORD env var is set

## External Dependencies

### Blockchain Services
- **Solana RPC**: Public node (`solana-rpc.publicnode.com`) for token data queries
- **Token Data Source**: pump.fun for $NORMIE token information

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries with schema defined in `/shared/schema.ts`

### Third-Party Libraries
- **@solana/web3.js**: Solana blockchain interaction
- **Chart.js**: Price and volume charting
- **Radix UI**: Accessible UI component primitives
- **TanStack Query**: Async state management and caching

### External Links (Social)
- **Telegram**: @TheNormieNation community group
- **X/Twitter**: @NormieCEO official account
- **pump.fun**: Token trading page