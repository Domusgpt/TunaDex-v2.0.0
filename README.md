# Project Ontology

A live, API-driven project management dashboard for the **Domusgpt / GEN-RL-MiLLz / Clear Seas Solutions** ecosystem.

Auto-discovers repos from GitHub, enriches them with live metadata (branches, PRs, commits, CI status, languages), stores everything in Firebase Firestore, and exposes both a React dashboard and an MCP server for AI agent integration.

## Features

- **GitHub Auto-Discovery** — Scans all repos in the Domusgpt org via GitHub API
- **Rich Enrichment** — Branches, open PRs, recent commits, Actions status, language breakdown
- **Interactive Tagging** — Categorize projects by type, status, priority, and custom groups
- **Real-time Dashboard** — React + Tailwind dark theme with grid/list views, search, and filters
- **MCP Server** — AI agent tools for querying project state (stdio + HTTP transport)
- **Firebase Firestore** — Persistent storage with in-memory fallback for offline/demo mode
- **Context Doc Generator** — Auto-generate Markdown project briefings (Phase 4)

## Quick Start

```bash
npm install
cp .env.example .env
# Add your GITHUB_PAT to .env
npm run dev
```

See [SETUP.md](SETUP.md) for detailed setup instructions.

## Stack

| Layer | Tech |
|-------|------|
| Backend | Node.js, Express, TypeScript, Octokit, Firebase Admin |
| Frontend | React 19, Vite 6, Tailwind CSS v4, TanStack Query, Zustand |
| MCP Server | @modelcontextprotocol/sdk, StreamableHTTP |
| Database | Firebase Firestore (in-memory fallback) |

## Design

Dark cyberpunk theme with cyan/violet/gold accent palette on near-black backgrounds. Fonts: Orbitron (headings), Rajdhani (body), IBM Plex Mono (code/labels).

## Agent Integration

See [SKILL.md](SKILL.md) for MCP tool documentation and Claude Desktop configuration.
