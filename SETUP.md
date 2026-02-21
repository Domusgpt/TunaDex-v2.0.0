# Project Ontology — Setup Guide

## Prerequisites
- Node.js 18+ (recommended: 22)
- npm 10+
- A GitHub account with access to the Domusgpt org
- (Optional) Firebase project for persistent storage

## Step 1: Clone and Install

```bash
git clone https://github.com/Domusgpt/TunaDex-v2.0.0.git
cd TunaDex-v2.0.0
git checkout claude/api-project-dashboard-7AJNi
npm install
```

## Step 2: Create Your .env File

```bash
cp .env.example .env
```

## Step 3: Get a GitHub Personal Access Token

1. Go to https://github.com/settings/tokens
2. Click **"Generate new token (classic)"**
3. Give it a name like "project-ontology"
4. Select scopes: `repo`, `read:org`, `read:user`
5. Click **Generate token**
6. Copy the token and paste it into your `.env`:
   ```
   GITHUB_PAT=ghp_your_actual_token_here
   GITHUB_ORG=Domusgpt
   ```

## Step 4: Firebase Setup (Optional — for persistent storage)

Without Firebase, data lives in memory and resets on restart. With Firebase, your tags and discovery data persist.

1. Go to https://console.firebase.google.com
2. Select or create a project (e.g., "tuna-dex")
3. Go to **Project Settings → Service accounts**
4. Click **"Generate new private key"**
5. Save the JSON file as `firebase-sa-key.json` in the project root
6. Update `.env`:
   ```
   FIREBASE_PROJECT_ID=tuna-dex
   FIREBASE_SA_KEY=./firebase-sa-key.json
   ```

## Step 5: Run It

```bash
# Start both backend and frontend
npm run dev
```

- Backend: http://localhost:3001
- Frontend: http://localhost:5173

## Step 6: Discover Your Repos

Either:
- Click the **"Discover"** button in the dashboard
- Or hit the API: `curl -X POST http://localhost:3001/api/projects/discover`

This scans all repos in the Domusgpt org and populates the dashboard.

## Step 7: Tag Your Projects

Click any project card to open the detail modal. Use the tag editor on the right to assign:
- **Category**: geometric, vib34d, flutter, agent, creative, research, business, infra
- **Status**: active, beta, prototype, research, delivered, archived
- **Priority**: high, medium, low
- **Group**: any custom grouping
- **Custom tags**: freeform tags

## Step 8: MCP Server (for Claude)

### Claude Code (local)
```bash
npm run mcp
```

### Claude Desktop
Add to `~/.config/claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "project-ontology": {
      "command": "npx",
      "args": ["tsx", "/full/path/to/TunaDex-v2.0.0/packages/mcp-server/src/index.ts", "--stdio"],
      "env": {
        "API_BASE_URL": "http://localhost:3001"
      }
    }
  }
}
```

**Note:** The backend must be running for the MCP server to work (it queries the backend API).

## Google OAuth Setup (Phase 2 — Drive/Calendar)

When you're ready for Google Drive and Calendar integration:

1. Go to https://console.cloud.google.com
2. Select your project (tuna-dex)
3. Enable APIs: **Google Drive API**, **Google Calendar API**
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**
5. Application type: **Web application**
6. Authorized JavaScript origins:
   - `http://localhost:3001`
   - `http://localhost:5173`
7. Authorized redirect URIs:
   - `http://localhost:3001/auth/callback`
8. Copy Client ID and Client Secret into `.env`

## Troubleshooting

### "Demo Mode" instead of "Live Mode"
- Check that `GITHUB_PAT` is set in `.env`
- Verify the token hasn't expired: `curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user`

### Discovery returns 0 projects
- Verify the org name: `GITHUB_ORG=Domusgpt`
- Check token permissions: needs `repo` and `read:org` scopes

### Firestore not connecting
- Verify `firebase-sa-key.json` exists in the project root
- Check the project ID matches your Firebase project
- Ensure the service account has Firestore access
