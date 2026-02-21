# Project Ontology — Claude Agent Skill

## Description
Project Ontology is a live, API-driven project management dashboard for the Domusgpt / GEN-RL-MiLLz / Clear Seas Solutions ecosystem. It auto-discovers GitHub repos, enriches them with metadata (branches, PRs, commits, CI status, languages), stores data in Firebase Firestore, and exposes an MCP server for AI agent querying.

## Available MCP Tools

### `list_projects`
List all projects, optionally filtered by category, status, or group.
- **Input**: `{ category?: string, status?: string, group?: string, limit?: number }`
- **Output**: Formatted list of projects with name, status, category, and last activity

### `get_project_details`
Get full enriched data for a specific project including branches, PRs, commits, and CI status.
- **Input**: `{ projectId: string }`
- **Output**: Complete project detail with all enrichment data

### `search_projects`
Full-text search across all project data (names, descriptions, topics, tags).
- **Input**: `{ query: string }`
- **Output**: Matching projects with relevance

### `get_recent_activity`
Get recent commits and PRs across all or filtered projects.
- **Input**: `{ category?: string, limit?: number }`
- **Output**: Activity feed sorted by date

## How to Use

### Claude Code (stdio)
```bash
cd /path/to/project-ontology
npm run mcp
```

### Claude Desktop Config
Add to `~/.config/claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "project-ontology": {
      "command": "npx",
      "args": ["tsx", "/path/to/project-ontology/packages/mcp-server/src/index.ts", "--stdio"],
      "env": {
        "API_BASE_URL": "http://localhost:3001"
      }
    }
  }
}
```

### Remote (StreamableHTTP)
Start the MCP server on a port:
```bash
MCP_SERVER_PORT=3100 npx tsx packages/mcp-server/src/index.ts
```
Connect at `http://localhost:3100/mcp`

## Context for Agents

When working on any project in the Domusgpt ecosystem, this tool lets you:
1. **Understand the landscape** — `list_projects` shows all repos with their status and categories
2. **Deep dive into a project** — `get_project_details` gives branches, open PRs, recent commits, and CI
3. **Find related work** — `search_projects` discovers connections across the ecosystem
4. **Track velocity** — `get_recent_activity` shows what's moving across all projects

## Project Categories
- `geometric` — Three.js/WebGL creative coding
- `vib34d` — Vibration-based 3D engine
- `flutter` — Flutter mobile apps
- `agent` / `ai` — AI/LLM agent systems
- `creative` — ML art, galleries, generative
- `research` — Academic papers, experiments
- `business` / `website` — Client work, corporate sites
- `infra` / `infrastructure` — Terraform, DevOps

## Status Values
- `active` — Actively developed
- `beta` — Feature-complete, testing
- `prototype` — Early exploration
- `research` — Academic/experimental
- `delivered` — Shipped to client
- `archived` — No longer maintained
