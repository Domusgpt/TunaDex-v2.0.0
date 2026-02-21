import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchProjects } from "../data/api-client.js";

export function registerListProjects(server: McpServer): void {
  server.registerTool(
    "list_projects",
    {
      description:
        "List projects in the ontology, optionally filtered by category, status, or group. Returns a summary of each project including name, status, category, and last activity.",
      inputSchema: {
        category: z
          .string()
          .optional()
          .describe("Filter by project category (e.g. 'web', 'api', 'library')"),
        status: z
          .string()
          .optional()
          .describe("Filter by project status (e.g. 'active', 'archived', 'planning')"),
        group: z
          .string()
          .optional()
          .describe("Filter by project group or team"),
        limit: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Maximum number of projects to return"),
      },
    },
    async (params) => {
      try {
        const filters: Record<string, string> = {};
        if (params.category) filters.category = params.category;
        if (params.status) filters.status = params.status;
        if (params.group) filters.group = params.group;
        if (params.limit !== undefined) filters.limit = String(params.limit);

        const projects = await fetchProjects(filters);

        if (!projects || projects.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No projects found matching the specified filters.",
              },
            ],
          };
        }

        const lines: string[] = [];
        lines.push(`Found ${projects.length} project(s):\n`);

        for (const project of projects) {
          const name = project.name || project.title || "Unnamed";
          const status = project.status || "unknown";
          const category = project.category || "uncategorized";
          const lastActivity =
            project.lastActivity || project.updatedAt || "N/A";

          lines.push(`- **${name}**`);
          lines.push(`  Status: ${status}`);
          lines.push(`  Category: ${category}`);
          lines.push(`  Last Activity: ${lastActivity}`);
          lines.push("");
        }

        return {
          content: [{ type: "text" as const, text: lines.join("\n") }],
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error listing projects: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
