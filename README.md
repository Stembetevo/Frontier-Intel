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
curl http://localhost:3000/api/healthz

# Systems threat data
curl http://localhost:3000/api/systems

# Intel reports
curl http://localhost:3000/api/intel

# Trigger one telemetry ingest pass from Stillness/mainnet
curl -X POST http://localhost:3000/api/telemetry/sync \
   -H "Content-Type: application/json" \
   -d '{"limit":250}'

# Check indexer cursor/status
curl http://localhost:3000/api/telemetry/status
```

### 6. Live telemetry mode
The frontend is now live-first: if no indexed systems are available, it shows a telemetry hint instead of generating fake systems. If you want demo visuals for UI-only testing, set `VITE_ENABLE_DEMO_FALLBACK=true` in `artifacts/frontier-intel/.env`.

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

---

## Deployment

The app is split into two independently deployed services:

```
Frontend  →  Vercel   (static React/Vite build)
Backend   →  Render   (Node.js Express server)
Database  →  Render PostgreSQL  (or any external Postgres)
```

---

### Step 1 — Deploy the Backend on Render

**Connect your repo to Render:**

1. Go to [render.com](https://render.com) → New → **Web Service**
2. Connect your GitHub repo
3. Set the following in the service settings:

| Setting | Value |
|---------|-------|
| **Root Directory** | `artifacts/api-server` |
| **Runtime** | Node |
| **Build Command** | `cd ../.. && npm install -g pnpm && pnpm install --frozen-lockfile && pnpm --filter @workspace/api-server run build` |
| **Start Command** | `node dist/index.cjs` |
| **Node Version** | 20 |

**Environment Variables on Render:**

| Variable | Value | Notes |
|----------|-------|-------|
| `PORT` | `10000` | Render sets this automatically — you don't need to add it |
| `DATABASE_URL` | `postgres://...` | From your Render Postgres instance (copy the **Internal URL**) |
| `CORS_ORIGIN` | `https://your-app.vercel.app` | Your Vercel frontend URL — add this **after** deploying to Vercel |
| `NODE_ENV` | `production` | |

**Add a Render PostgreSQL database:**

1. Render dashboard → New → **PostgreSQL**
2. After it's created, copy the **Internal Database URL**
3. Paste it as `DATABASE_URL` in your web service's environment variables

**Run the database migration:**

After the first deploy succeeds, open the Render Shell for the web service and run:
```bash
npx drizzle-kit push
```
This creates the `intel_reports` table.

**Verify the backend:**
```bash
curl https://your-api.onrender.com/api/health
# Should return: {"status":"ok"}

curl https://your-api.onrender.com/api/systems
# Should return: {"systems":[...]}
```

---

### Step 2 — Deploy the Frontend on Vercel

**Connect your repo to Vercel:**

1. Go to [vercel.com](https://vercel.com) → New Project → Import your GitHub repo
2. Set the following in **Configure Project**:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Vite |
| **Root Directory** | `artifacts/frontier-intel` |
| **Build Command** | `cd ../.. && npm install -g pnpm && pnpm install --frozen-lockfile && pnpm --filter @workspace/frontier-intel run build` |
| **Output Directory** | `dist` |
| **Install Command** | *(leave blank — handled by build command)* |

**Environment Variables on Vercel:**

Add these under **Project → Settings → Environment Variables**:

| Variable | Value | Notes |
|----------|-------|-------|
| `VITE_API_URL` | `https://your-api.onrender.com` | Your Render backend URL — no trailing slash |
| `VITE_GOOGLE_CLIENT_ID` | `855060394278-....apps.googleusercontent.com` | Google OAuth client ID for zkLogin |
| `VITE_SUI_NETWORK` | `mainnet` | Use mainnet for Stillness-aligned wallet reads |
| `VITE_INTEL_PACKAGE_ID` | *(empty for now)* | Fill after deploying the Move contract |
| `VITE_INTEL_REGISTRY_ID` | *(empty for now)* | Fill after deploying the Move contract |
| `VITE_ENABLE_DEMO_FALLBACK` | `false` | Keep live-only behavior; set `true` only for UI demo mode |

**After Vercel deploys, copy your Vercel URL** (e.g. `https://frontier-intel.vercel.app`) and:
1. Go back to Render → your web service → Environment
2. Set `CORS_ORIGIN` = `https://frontier-intel.vercel.app`
3. Trigger a **Manual Deploy** on Render to pick up the new CORS setting

---

### Step 3 — Configure Google OAuth for Production

Your Google OAuth client needs to know about the production domain:

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials
2. Click your OAuth 2.0 Client ID
3. Under **Authorized JavaScript origins**, add:
   ```
   https://frontier-intel.vercel.app
   ```
4. Under **Authorized redirect URIs**, add:
   ```
   https://frontier-intel.vercel.app/
   ```
5. Save — changes take ~5 minutes to propagate

---

### Step 4 — Verify the Full Stack

```bash
# 1. Backend health
curl https://your-api.onrender.com/api/health

# 2. CORS is working (replace with your actual URLs)
curl -H "Origin: https://frontier-intel.vercel.app" \
     -I https://your-api.onrender.com/api/systems
# Look for: Access-Control-Allow-Origin: https://frontier-intel.vercel.app

# 3. Frontend loads at
# https://frontier-intel.vercel.app

# 4. Connect wallet → submit intel → check it appears
curl https://your-api.onrender.com/api/intel
```

---

### Environment Variable Summary

#### Render (backend)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Auto-set | Render sets this — do not override |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `CORS_ORIGIN` | Yes | Your Vercel frontend URL (comma-separated for multiple) |
| `NODE_ENV` | Yes | Set to `production` |
| `SUI_RPC_URL` | Yes | `https://fullnode.mainnet.sui.io:443` for Stillness data |
| `TELEMETRY_SYNC_ENABLED` | No | `true` by default; set `false` to disable background sync |
| `TELEMETRY_SYNC_ON_START` | No | `true` by default; run sync once at startup |
| `TELEMETRY_SYNC_INTERVAL_MS` | No | Sync interval in ms (default `60000`) |
| `TELEMETRY_SYNC_LIMIT` | No | Events per source sync pass (default `200`, max `250`) |
| `TELEMETRY_SYNC_API_KEY` | No | If set, required for `POST /api/telemetry/sync` |

#### Vercel (frontend)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Your Render backend URL, no trailing slash |
| `VITE_GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID for zkLogin |
| `VITE_SUI_NETWORK` | No | `mainnet` (default) or `testnet` |
| `VITE_INTEL_PACKAGE_ID` | No | Move contract package ID (after deployment) |
| `VITE_INTEL_REGISTRY_ID` | No | Move contract Registry object ID (after deployment) |
| `VITE_ENABLE_DEMO_FALLBACK` | No | `false` (default), set `true` for mock map data |

---

### Troubleshooting

**CORS errors in browser console**
- Make sure `CORS_ORIGIN` on Render exactly matches your Vercel URL (no trailing slash)
- Redeploy Render after adding/changing `CORS_ORIGIN`

**"Failed to fetch" on the frontend**
- Check `VITE_API_URL` is set correctly in Vercel (no trailing slash)
- Make sure the Render service is awake — free tier spins down after 15 min of inactivity

**Google login redirect fails**
- Add your Vercel URL to the authorized origins AND redirect URIs in Google Cloud Console
- Ensure `VITE_GOOGLE_CLIENT_ID` in Vercel matches the client ID exactly

**Database errors on Render**
- Run `npx drizzle-kit push` in the Render Shell to create/update tables
- Use the **Internal** Database URL (not external) to avoid egress charges
