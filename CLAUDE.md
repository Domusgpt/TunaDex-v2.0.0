# Project Ontology — Developer Context

## What This Is
A full-stack project management platform for the Domusgpt GitHub organization. It auto-discovers repos, enriches them with live GitHub data, stores everything in Firebase Firestore, and serves a React dashboard + MCP server.

## Architecture
```
packages/
├── backend/      Express API (port 3001) — GitHub discovery, Firestore CRUD, REST endpoints
├── frontend/     React + Vite + Tailwind v4 dashboard (port 5173) — project cards, tagging, search
└── mcp-server/   MCP server (stdio + HTTP) — AI agent tools for querying project data
```

## Quick Start
```bash
# 1. Install dependencies
npm install

# 2. Copy env and add your secrets
cp .env.example .env
# Edit .env with your GITHUB_PAT and FIREBASE credentials

# 3. Run both backend + frontend
npm run dev

# 4. Run MCP server (separate terminal)
npm run mcp
```

Without any API keys, the app runs in **demo mode** with 8 realistic mock projects.

## Key Files
- `packages/backend/src/index.ts` — Server entry point
- `packages/backend/src/github/discovery.ts` — GitHub org repo scanner
- `packages/backend/src/github/mock-data.ts` — Demo data (8 mock projects)
- `packages/backend/src/firestore/projects.ts` — Data layer (Firestore + in-memory fallback)
- `packages/backend/src/routes/projects.ts` — REST API endpoints
- `packages/frontend/src/views/DashboardView.tsx` — Main dashboard view
- `packages/frontend/src/components/ProjectCard.tsx` — Project card component
- `packages/frontend/src/components/ProjectDetail.tsx` — Detail modal with tabs
- `packages/frontend/src/lib/api.ts` — Frontend API client + TypeScript types
- `packages/mcp-server/src/index.ts` — MCP server entry (stdio + StreamableHTTP)

## API Endpoints
- `GET /api/health` — Health check with mode (demo/live)
- `GET /api/projects` — List projects (query: category, status, group, search)
- `GET /api/projects/stats` — Aggregate statistics
- `GET /api/projects/:id` — Single project detail
- `POST /api/projects/discover` — Trigger GitHub discovery scan
- `PATCH /api/projects/:id/tags` — Update project tags

## Design Tokens
- Dark theme: `#030609` (void), `#060C12` (deep), `#0A1520` (panel)
- Accents: cyan `#00F5FF`, violet `#8B5CF6`, gold `#F59E0B`, emerald `#10B981`, rose `#F43F5E`
- Fonts: Orbitron (headings), Rajdhani (body), IBM Plex Mono (code)

## Tech Stack
- **Backend**: Node.js, Express, TypeScript, Octokit, Firebase Admin, Zod
- **Frontend**: React 19, Vite 6, Tailwind CSS v4, TanStack Query, Zustand
- **MCP**: @modelcontextprotocol/sdk, StreamableHTTP transport
- **Database**: Firebase Firestore (with in-memory fallback)

## Environment Variables
See `.env.example` for full list. Critical ones:
- `GITHUB_PAT` — GitHub Personal Access Token (enables live discovery)
- `FIREBASE_PROJECT_ID` + `FIREBASE_SA_KEY` — Firestore storage
- `PORT` — Backend port (default 3001)
- `MCP_SERVER_PORT` — MCP server port (default 3100)
