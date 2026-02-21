import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchProjects } from "../data/api-client.js";

interface ActivityItem {
  type: "commit" | "pull_request";
  projectName: string;
  title: string;
  author: string;
  date: string;
  details: string;
}

function parseDate(dateStr: string): number {
  const parsed = Date.parse(dateStr);
  return isNaN(parsed) ? 0 : parsed;
}

export function registerGetRecentActivity(server: McpServer): void {
  server.registerTool(
    "get_recent_activity",
    {
      description:
        "Get a feed of recent activity across all projects, including commits and pull requests. Sorted by most recent first. Optionally filter by category.",
      inputSchema: {
        category: z
          .string()
          .optional()
          .describe("Filter activity to projects in this category"),
        limit: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Maximum number of activity items to return (default: 20)"),
      },
    },
    async (params) => {
      try {
        const filters: Record<string, string> = {};
        if (params.category) filters.category = params.category;

        const projects = await fetchProjects(filters);

        if (!projects || projects.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No projects found. No recent activity to display.",
              },
            ],
          };
        }

        const activityItems: ActivityItem[] = [];

        for (const project of projects) {
          const projectName = project.name || project.title || "Unnamed";

          // Collect commits
          const commits: any[] =
            project.recentCommits || project.commits || [];
          for (const commit of commits) {
            const message = commit.message || commit.title || "No message";
            const sha = commit.sha
              ? commit.sha.substring(0, 7)
              : commit.hash
                ? commit.hash.substring(0, 7)
                : "";
            const author = commit.author || "unknown";
            const date =
              commit.date || commit.committedAt || commit.createdAt || "";

            activityItems.push({
              type: "commit",
              projectName,
              title: message,
              author,
              date,
              details: sha ? `sha: ${sha}` : "",
            });
          }

          // Collect pull requests
          const prs: any[] = project.pullRequests || project.openPRs || [];
          for (const pr of prs) {
            const prTitle = pr.title || pr.name || "Untitled PR";
            const prNumber = pr.number ? `#${pr.number}` : "";
            const author = pr.author || "unknown";
            const date = pr.createdAt || pr.updatedAt || pr.date || "";
            const state = pr.state || pr.status || "open";

            activityItems.push({
              type: "pull_request",
              projectName,
              title: `${prNumber ? prNumber + " " : ""}${prTitle}`,
              author,
              date,
              details: `state: ${state}`,
            });
          }
        }

        // Sort by date descending (most recent first)
        activityItems.sort((a, b) => parseDate(b.date) - parseDate(a.date));

        // Apply limit
        const limit = params.limit ?? 20;
        const limited = activityItems.slice(0, limit);

        if (limited.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No recent activity found across projects.",
              },
            ],
          };
        }

        const lines: string[] = [];
        lines.push(
          `Recent activity (${limited.length} of ${activityItems.length} items):\n`
        );

        for (const item of limited) {
          const icon = item.type === "commit" ? "[Commit]" : "[PR]";
          const dateStr = item.date ? ` (${item.date})` : "";

          lines.push(
            `${icon} **${item.projectName}** - ${item.title}`
          );
          lines.push(
            `  Author: ${item.author}${dateStr}${item.details ? ` | ${item.details}` : ""}`
          );
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
              text: `Error fetching recent activity: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
