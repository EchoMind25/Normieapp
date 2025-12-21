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
- Interactive floating mascot with speech bubbles (auto-dismiss after 8s)
- Whale buy alerts (2M+ tokens) with push notifications
- Jeet sell alarms (5M+ tokens) with push notifications

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
- **ETag Caching**: All API endpoints support conditional GET with ETags. Frontend sends If-None-Match headers and skips state updates on 304 Not Modified responses, reducing unnecessary re-renders and data transfers when data hasn't changed.

### Solana Integration
- **RPC Endpoint**: Public node at `https://solana-rpc.publicnode.com`
- **Token Address**: `FrSFwE2BxWADEyUWFXDMAeomzuB4r83ZvzdG9sevpump`
- **Library**: @solana/web3.js for blockchain queries
- **Data Fetched**: Token account info, supply metrics, transaction history

### Streamflow Integration (December 2025)
- **SDK**: @streamflow/stream for querying token locks/vesting contracts
- **Service**: `server/streamflow.ts` - queries Streamflow for Normie token locks by mint address
- **Cache**: 5-minute TTL to avoid excessive API calls
- **Fallback**: Returns last known value (default 230M) if API fails
- **Data**: Real-time locked token amounts from Streamflow vesting contracts

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
- **Seed Data**: Admin accounts seeded automatically (polls removed - user-created only)
- **Admin Account**: Default password "NormieAdmin2024!" unless NORMIE_ADMIN_PASSWORD env var is set
- **Transaction Monitoring**: Whale detection (2M+ tokens bought) and jeet detection (5M+ tokens sold)
- **Push Notifications**: Web Push API with VAPID keys for whale alerts and jeet alarms

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

## Embeddable Chart Widget (December 2025)

A production-ready embeddable chart solution for displaying $NORMIE price charts on external websites.

### Embed Page
- **URL**: `/embed/chart`
- **Component**: `client/src/pages/EmbedChart.tsx`
- **Parameters**: theme, height, range, controls, branding, color, token

### JavaScript SDK Widget
- **File**: `client/public/normie-chart-widget.js`
- **Global**: `window.NormieChart`
- **Methods**: `init()`, `initAll()`, `ping()`, `version`

### Embed API Endpoints (CORS-enabled)
- `GET /api/embed/price-history?range=<timeRange>` - Historical price data
- `GET /api/embed/metrics` - Current price and stats
- `GET /api/embed/config` - Widget configuration info

### CORS Whitelist
Configured in `server/routes.ts` - EMBED_ALLOWED_ORIGINS array:
- normienation.com, www.normienation.com
- localhost development ports

### Optional Authentication
Set `EMBED_SECRET` environment variable to require token authentication for embed endpoints.

### Documentation
See `EMBED_INTEGRATION_GUIDE.md` for complete integration instructions for external developers.

## Mobile App Deployment (December 2025)

### Capacitor Configuration
- **Config**: `capacitor.config.ts`
- **App ID**: com.normie.observer
- **App Name**: Normie Observer
- **Web Dir**: dist (Vite build output)

### Background Data Collection
- **Service**: `server/dataCollector.ts` - Runs periodic price collection
- **Smart Fetcher**: `server/smartDataFetcher.ts` - Adaptive polling with change detection
- **Database Tables**: `price_history`, `api_cache` for reducing external API calls

### Pre-Deployment Testing
- **Script**: `scripts/pre-deployment-tests.ts`
- **Run**: `npx tsx scripts/pre-deployment-tests.ts`

### App Icon Generation
- **Script**: `scripts/generate-app-icons.sh`
- **Requires**: ImageMagick
- **Usage**: `./scripts/generate-app-icons.sh path/to/icon.png`

### Deployment Documentation
- **Guide**: `docs/DEPLOYMENT.md` - Complete iOS/Android submission guide

### Legal Pages
- **Privacy Policy**: `/privacy` - Updated for minimal analytics, public blockchain data only
- **Terms of Service**: `/terms` - Crypto disclaimers, age requirements
- **Support Email**: support@tryechomind.net