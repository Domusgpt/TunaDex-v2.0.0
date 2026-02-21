import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { randomUUID } from "node:crypto";

import { registerListProjects } from "./tools/list-projects.js";
import { registerGetProjectDetails } from "./tools/get-project-details.js";
import { registerSearchProjects } from "./tools/search-projects.js";
import { registerGetRecentActivity } from "./tools/get-recent-activity.js";

function log(message: string): void {
  process.stderr.write(`[mcp-server] ${message}\n`);
}

async function main(): Promise<void> {
  const server = new McpServer({
    name: "project-ontology",
    version: "1.0.0",
  });

  // Register all tools
  registerListProjects(server);
  registerGetProjectDetails(server);
  registerSearchProjects(server);
  registerGetRecentActivity(server);

  log("Registered tools: list_projects, get_project_details, search_projects, get_recent_activity");

  const useStdio = process.argv.includes("--stdio");

  if (useStdio) {
    log("Starting in stdio transport mode");
    const transport = new StdioServerTransport();
    await server.connect(transport);
    log("MCP server connected via stdio");
  } else {
    const port = parseInt(process.env.MCP_SERVER_PORT || "3100", 10);
    const app = express();

    // Map to store transports by session ID
    const transports = new Map<string, StreamableHTTPServerTransport>();

    // Handle POST requests for client-to-server communication
    app.post("/mcp", async (req, res) => {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;

      if (sessionId && transports.has(sessionId)) {
        // Existing session: reuse transport
        const transport = transports.get(sessionId)!;
        await transport.handleRequest(req, res);
      } else if (!sessionId) {
        // New session: create transport
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (newSessionId) => {
            transports.set(newSessionId, transport);
            log(`Session initialized: ${newSessionId}`);
          },
        });

        transport.onclose = () => {
          const sid = [...transports.entries()].find(
            ([, t]) => t === transport
          )?.[0];
          if (sid) {
            transports.delete(sid);
            log(`Session closed: ${sid}`);
          }
        };

        // Connect the MCP server to this transport
        await server.connect(transport);
        await transport.handleRequest(req, res);
      } else {
        // Session ID provided but not found
        res.status(400).json({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Invalid session ID" },
          id: null,
        });
      }
    });

    // Handle GET requests for server-to-client notifications via SSE
    app.get("/mcp", async (req, res) => {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;

      if (!sessionId || !transports.has(sessionId)) {
        res.status(400).json({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Invalid or missing session ID" },
          id: null,
        });
        return;
      }

      const transport = transports.get(sessionId)!;
      await transport.handleRequest(req, res);
    });

    // Handle DELETE requests for session termination
    app.delete("/mcp", async (req, res) => {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;

      if (!sessionId || !transports.has(sessionId)) {
        res.status(400).json({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Invalid or missing session ID" },
          id: null,
        });
        return;
      }

      const transport = transports.get(sessionId)!;
      await transport.handleRequest(req, res);
    });

    app.listen(port, () => {
      log(`MCP server listening on http://localhost:${port}/mcp`);
      log(`Transport: StreamableHTTP`);
    });
  }
}

main().catch((error) => {
  log(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
