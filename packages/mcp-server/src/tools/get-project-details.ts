import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchProject } from "../data/api-client.js";

export function registerGetProjectDetails(server: McpServer): void {
  server.registerTool(
    "get_project_details",
    {
      description:
        "Get full details for a specific project by its ID. Returns description, languages, branches, open PRs, recent commits, and tags.",
      inputSchema: {
        projectId: z
          .string()
          .describe("The unique identifier of the project to retrieve"),
      },
    },
    async (params) => {
      try {
        const project = await fetchProject(params.projectId);

        if (!project) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Project with ID "${params.projectId}" not found.`,
              },
            ],
            isError: true,
          };
        }

        const lines: string[] = [];

        const name = project.name || project.title || "Unnamed";
        lines.push(`# ${name}`);
        lines.push("");

        if (project.description) {
          lines.push(`**Description:** ${project.description}`);
          lines.push("");
        }

        lines.push(`**Status:** ${project.status || "unknown"}`);
        lines.push(`**Category:** ${project.category || "uncategorized"}`);

        if (project.group) {
          lines.push(`**Group:** ${project.group}`);
        }

        if (project.url || project.repoUrl) {
          lines.push(`**Repository:** ${project.url || project.repoUrl}`);
        }

        lines.push("");

        // Languages
        const languages: string[] = project.languages || [];
        if (languages.length > 0) {
          lines.push("## Languages");
          for (const lang of languages) {
            lines.push(`- ${lang}`);
          }
          lines.push("");
        }

        // Branches
        const branches: any[] = project.branches || [];
        if (branches.length > 0) {
          lines.push("## Branches");
          for (const branch of branches) {
            const branchName =
              typeof branch === "string" ? branch : branch.name || branch;
            const isDefault =
              typeof branch === "object" && branch.default
                ? " (default)"
                : "";
            lines.push(`- ${branchName}${isDefault}`);
          }
          lines.push("");
        }

        // Open PRs
        const prs: any[] = project.pullRequests || project.openPRs || [];
        if (prs.length > 0) {
          lines.push("## Open Pull Requests");
          for (const pr of prs) {
            const prTitle = pr.title || pr.name || "Untitled PR";
            const prNumber = pr.number ? `#${pr.number}` : "";
            const prAuthor = pr.author ? ` by ${pr.author}` : "";
            const prDate = pr.createdAt
              ? ` (${pr.createdAt})`
              : pr.date
                ? ` (${pr.date})`
                : "";
            lines.push(`- ${prNumber} ${prTitle}${prAuthor}${prDate}`);
          }
          lines.push("");
        }

        // Recent Commits
        const commits: any[] =
          project.recentCommits || project.commits || [];
        if (commits.length > 0) {
          lines.push("## Recent Commits");
          for (const commit of commits.slice(0, 10)) {
            const msg = commit.message || commit.title || "No message";
            const sha = commit.sha
              ? commit.sha.substring(0, 7)
              : commit.hash
                ? commit.hash.substring(0, 7)
                : "";
            const author = commit.author ? ` by ${commit.author}` : "";
            const date = commit.date || commit.committedAt || "";
            lines.push(
              `- ${sha ? `\`${sha}\` ` : ""}${msg}${author}${date ? ` (${date})` : ""}`
            );
          }
          lines.push("");
        }

        // Tags
        const tags: string[] = project.tags || [];
        if (tags.length > 0) {
          lines.push("## Tags");
          lines.push(tags.join(", "));
          lines.push("");
        }

        // Last Activity
        if (project.lastActivity || project.updatedAt) {
          lines.push(
            `**Last Activity:** ${project.lastActivity || project.updatedAt}`
          );
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
              text: `Error fetching project details: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
