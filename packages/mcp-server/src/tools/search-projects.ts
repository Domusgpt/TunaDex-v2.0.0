import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { searchProjects } from "../data/api-client.js";

export function registerSearchProjects(server: McpServer): void {
  server.registerTool(
    "search_projects",
    {
      description:
        "Search for projects by a free-text query. Matches against project names, descriptions, tags, and other metadata. Returns a summary of matching projects.",
      inputSchema: {
        query: z
          .string()
          .describe("The search query string to match against projects"),
      },
    },
    async (params) => {
      try {
        const projects = await searchProjects(params.query);

        if (!projects || projects.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No projects found matching "${params.query}".`,
              },
            ],
          };
        }

        const lines: string[] = [];
        lines.push(
          `Found ${projects.length} project(s) matching "${params.query}":\n`
        );

        for (const project of projects) {
          const name = project.name || project.title || "Unnamed";
          const status = project.status || "unknown";
          const category = project.category || "uncategorized";
          const description = project.description
            ? project.description.length > 120
              ? project.description.substring(0, 120) + "..."
              : project.description
            : "No description";
          const id = project.id || project._id || "";
          const tags: string[] = project.tags || [];

          lines.push(`- **${name}**${id ? ` (ID: ${id})` : ""}`);
          lines.push(`  Status: ${status} | Category: ${category}`);
          lines.push(`  ${description}`);
          if (tags.length > 0) {
            lines.push(`  Tags: ${tags.join(", ")}`);
          }
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
              text: `Error searching projects: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
