# Frontier Intel - EVE Frontier Galaxy Intelligence Dashboard

## Overview

Frontier Intel is a live galaxy threat map and intelligence dashboard for EVE Frontier (CCP Games' blockchain space survival MMO on Sui blockchain). Built for the EVE Frontier x Sui Hackathon (Theme: "Toolkit for Civilization").

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/frontier-intel) with D3.js galaxy map
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM (intel reports persistence)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## EVE Frontier Blockchain Details

- **World Package ID**: `0x2ff3e06b96eb830bdcffbc6cae9b8fe43f005c3b94cef05d9ec23057df16f107`
- **Live Gateway (Stillness)**: `https://blockchain-gateway-stillness.live.tech.evefrontier.com`
- **Gateway WSS**: `wss://blockchain-gateway-stillness.live.tech.evefrontier.com`
- **Blockchain**: Sui (Cycle 5+, March 2025)

## Core Features

1. **Live Galaxy Map** — D3.js 2D interactive map with threat overlays (RED=HIGH, YELLOW=MEDIUM, GREEN=LOW)
2. **Smart Assembly Markers** — Player-built structures (Gates, Turrets, Storage, Network Nodes)
3. **Player Intel Reports** — Wallet-signed reports pinned to solar systems (stored in PostgreSQL)
4. **Gate Jump Traffic** — System activity and traffic analysis
5. **EVE Vault Wallet Connect** — Sui wallet integration for identity

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server with gateway proxy routes
│   │   └── src/
│   │       ├── lib/gatewayClient.ts     # EVE Frontier gateway HTTP client with caching
│   │       └── routes/
│   │           ├── kills.ts             # GET /api/kills
│   │           ├── assemblies.ts        # GET /api/assemblies
│   │           ├── jumps.ts             # GET /api/jumps
│   │           ├── intel.ts             # GET/POST/DELETE /api/intel
│   │           └── systems.ts          # GET /api/systems (aggregated threat data)
│   └── frontier-intel/     # React+Vite frontend
│       └── src/
│           ├── components/
│           │   ├── GalaxyMap.tsx        # D3.js interactive galaxy map
│           │   ├── SystemPanel.tsx      # System detail side panel
│           │   ├── IntelModal.tsx       # Intel report submission modal
│           │   ├── Navbar.tsx           # Top nav with wallet connect
│           │   ├── Legend.tsx           # Map legend/filters
│           │   └── ui/SciFiUI.tsx       # Reusable sci-fi UI components
│           ├── contexts/WalletContext.tsx  # Sui wallet state management
│           └── pages/Home.tsx           # Main map page
├── lib/
│   ├── api-spec/openapi.yaml  # OpenAPI spec (kills, assemblies, jumps, intel, systems)
│   ├── api-client-react/      # Generated React Query hooks
│   ├── api-zod/               # Generated Zod schemas
│   └── db/src/schema/
│       └── intel_reports.ts   # Intel reports table (PostgreSQL)
```

## API Endpoints

All routes proxied through Express, which fetches from EVE Frontier blockchain gateway:

- `GET /api/kills` — Recent kill events (KillmailCreatedEvent)
- `GET /api/assemblies` — Smart Assembly structures
- `GET /api/jumps` — Gate jump traffic
- `GET /api/systems` — Aggregated threat scores per solar system
- `GET /api/intel` — Player intel reports (from DB)
- `POST /api/intel` — Submit a new intel report (requires wallet_address)
- `DELETE /api/intel/:id` — Remove an intel report

## TypeScript & Composite Projects

- `lib/*` packages are composite and emit declarations via `tsc --build`.
- Root `tsconfig.json` is a solution file for libs only.
- Run typecheck: `pnpm run typecheck`
- Run codegen: `pnpm --filter @workspace/api-spec run codegen`
- Push DB schema: `pnpm --filter @workspace/db run push`

## Gateway Behavior

The gateway client (`artifacts/api-server/src/lib/gatewayClient.ts`) caches responses for 30 seconds and gracefully handles unreachable gateway (returns empty data). When deployed and connected to the internet, it will fetch live EVE Frontier blockchain data.
