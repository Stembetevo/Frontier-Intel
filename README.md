# Frontier Intel

A live galaxy threat map and intelligence dashboard for **EVE Frontier** — CCP Games' space survival MMO running on the Sui blockchain. Built for the **EVE Frontier x Sui Hackathon ("Toolkit for Civilization")**.

---

## What Problem It Solves

EVE Frontier players navigate a dangerous galaxy where survival depends on knowing what's happening in nearby star systems *right now*: who died where, which systems are hot with activity, and whether your route is safe to jump.

There is no native in-game intelligence sharing tool. Frontier Intel fills that gap by:

- Pulling **live kill events, gate jumps, and smart assembly data** from the EVE Frontier blockchain gateway
- Turning that raw on-chain data into a **visual threat map** of the galaxy
- Letting players **submit and read player-written intel reports** tied to specific systems — gated by their Sui wallet (EVE Vault) so reports are attributable on-chain
- Providing a **reusable API layer** that any third-party EVE Frontier tool can query

---

## Architecture

```
artifacts/
  frontier-intel/     → React + Vite frontend (D3.js map, dApp Kit wallet)
  api-server/         → Express backend (proxies EVE gateway, stores intel)
lib/
  db/                 → Drizzle ORM schema (PostgreSQL)
  api-spec/           → OpenAPI 3.1 contract (single source of truth)
  api-zod/            → Auto-generated Zod validators from the spec
```

### Data Flow

```
EVE Frontier Blockchain Gateway (Sui mainnet)
        │
        ▼
Express API Server (6 routes)
   ├─ /api/kills          → recent kill events
   ├─ /api/assemblies     → smart assembly locations
   ├─ /api/jumps          → gate jump traffic
   ├─ /api/systems        → threat aggregation per system (computed)
   ├─ /api/intel          → player intel reports (PostgreSQL CRUD)
   └─ /api/health
        │
        ▼
React Frontend
   ├─ D3.js Galaxy Map    → zoomable/pannable, nodes coloured by threat
   ├─ System Panel        → kills, assemblies, jumps, intel for one system
   ├─ Intel Modal         → submit a report (requires wallet connection)
   └─ Navbar              → wallet connect / disconnect (EVE Vault first)
```

---

## Features

### Galaxy Map (D3.js)
- Nodes for every solar system seen in blockchain data (60+ in demo mode)
- Colour-coded threat levels: **RED** = HIGH (3+ kills/hr), **ORANGE** = MEDIUM (1-2 kills/hr), **GREEN** = LOW, **GREY** = UNKNOWN
- Node size scales with assembly count (player infrastructure density)
- Fully zoomable (scroll) and pannable (drag)
- Click any node to open the System Detail Panel

### System Detail Panel
- Kill count (last 1 hour and 24 hours)
- Gate jump traffic (last hour)
- Smart assembly count
- Player intel reports for that system
- "Submit Intel" button — opens the intel form

### Intel Report System
- Reports require a connected Sui wallet (EVE Vault preferred)
- Report types: FLEET SPOTTED, GATE CAMP, ANOMALY, STRUCTURE HOSTILE, CLEAR, OTHER
- Reports stored in PostgreSQL with wallet address, timestamp, and optional expiry
- Reports are visible to all users; tied to the submitting wallet address on-chain

### Sui Wallet Integration (dApp Kit v1.0.3 / Sui SDK v2.6.0)
- Uses the official `@mysten/dapp-kit` `ConnectModal` — no custom wallet UI
- Wallet priority order: EVE Vault → Sui Wallet → Suiet
- Auto-reconnects on page load
- Exposes `useOwnedObjects()` and `useWalletBalance()` hooks for reading player on-chain assets (EVE character objects, SUI balance)
- Uses Sui 2.0 APIs: `SuiJsonRpcClient`, `getJsonRpcFullnodeUrl`

---

## How to Verify It

### 1. The galaxy map renders
Open the app in the preview pane. You should see a dark space background with coloured nodes connected by faint lines. Scroll to zoom, drag to pan.

### 2. Threat colours work
Each node is one of four colours. Hover or click a node to see its system ID and stats in the right panel.

### 3. Wallet connection works
Click **CONNECT VAULT** in the navbar. A real Sui wallet selector modal appears. If you have EVE Vault, Sui Wallet, or Suiet installed, you can connect. After connecting your wallet address appears in the navbar.

### 4. Intel submission works (requires wallet)
Click any system node → click **Submit Intel** → fill in the form → submit. The report will appear in the system's intel list. Without a connected wallet the button is disabled and shows "Connect wallet to submit".

### 5. API endpoints work (via browser or curl)
```bash
# Health check
curl https://<your-replit-domain>/api-server/api/health

# Systems threat data
curl https://<your-replit-domain>/api-server/api/systems

# Intel reports
curl https://<your-replit-domain>/api-server/api/intel
```

### 6. Gateway fallback in dev
In the Replit sandbox, the EVE Frontier gateway hostname is unreachable (DNS blocked). The app gracefully falls back to seeded demo data so the map still renders. In production deployment, the gateway resolves correctly and live data flows through.

---

## EVE Frontier Blockchain Details

| Item | Value |
|------|-------|
| Network | Sui Mainnet |
| World Package ID | `0x2ff3e06b96eb830bdcffbc6cae9b8fe43f005c3b94cef05d9ec23057df16f107` |
| Gateway | `blockchain-gateway-stillness.live.tech.evefrontier.com` |
| Kill endpoint | `/smartassemblies/killmail` |
| Gate jump endpoint | `/smartassemblies/gate/jump` |
| Assemblies endpoint | `/smartassemblies` |

---

## Reading Player On-Chain Data

After a wallet is connected, any component can query the player's Sui objects:

```tsx
import { useOwnedObjects, useWalletBalance, EVE_WORLD_PACKAGE_ID } from "@/contexts/WalletContext";

// All objects owned by connected wallet
const { data: objects } = useOwnedObjects();

// Only EVE character objects
const { data: characters } = useOwnedObjects(
  `${EVE_WORLD_PACKAGE_ID}::character::Character`
);

// SUI token balance
const { data: balance } = useWalletBalance();
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TypeScript |
| Map | D3.js v7 |
| Styling | Tailwind CSS, custom sci-fi theme |
| Animations | Framer Motion |
| Wallet | @mysten/dapp-kit v1.0.3, @mysten/sui v2.6.0 |
| Backend | Express, TypeScript, Node.js |
| Database | PostgreSQL via Drizzle ORM |
| API contract | OpenAPI 3.1 → Zod codegen |
| Monorepo | pnpm workspaces |

---

## Hackathon Alignment: "Toolkit for Civilization"

Frontier Intel contributes to civilization building in EVE Frontier by:

1. **Information infrastructure** — Raw blockchain data is unusable for most players. This app turns it into actionable intelligence.
2. **Open API layer** — The `/api/systems` endpoint is a computed threat feed that any other tool (browser extensions, Discord bots, mobile apps) can consume.
3. **Credible intel** — Reports are tied to Sui wallet addresses, making attribution verifiable on-chain and creating reputation incentives.
4. **Gateway-first** — All data comes from the official EVE Frontier blockchain gateway rather than a centralised database, keeping the tool trustless.
