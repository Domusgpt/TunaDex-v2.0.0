import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { ProjectStore } from "../firestore/projects.js";
import { createGitHubClient } from "../github/client.js";
import { discoverProjects } from "../github/discovery.js";
import { getMockProjects } from "../github/mock-data.js";
import type { Project } from "../firestore/types.js";

const router = Router();

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const ProjectTagsSchema = z.object({
  category: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  group: z.string().optional(),
  custom: z.array(z.string()).optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function queryString(val: unknown): string | undefined {
  if (typeof val === "string" && val.length > 0) return val;
  return undefined;
}

function queryInt(val: unknown): number | undefined {
  if (typeof val === "string") {
    const n = parseInt(val, 10);
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
}

function paramString(val: string | string[] | undefined): string {
  if (Array.isArray(val)) return val[0] ?? "";
  return val ?? "";
}

// ---------------------------------------------------------------------------
// Transform backend Project → frontend-expected shape
// ---------------------------------------------------------------------------

function transformProject(p: Project): Record<string, unknown> {
  return {
    ...p,
    name: p.id,
    isPrivate: p.visibility === "private",
    isArchived: false,
    isFork: false,
    pullRequests: (p.openPRs ?? []).map((pr) => ({
      ...pr,
      draft: false,
    })),
    branches: (p.branches ?? []).map((b) => ({
      name: b.name,
      sha: b.lastCommitSha,
      lastCommitMessage: "",
      lastCommitDate: b.lastCommitDate,
      isProtected: b.isDefault,
      isDefault: b.isDefault,
    })),
    recentCommits: p.recentCommits ?? [],
    lastWorkflowRun: p.actionsStatus
      ? {
          name: p.actionsStatus.name,
          status: p.actionsStatus.status,
          conclusion: p.actionsStatus.conclusion,
          branch: p.defaultBranch,
          createdAt: p.actionsStatus.createdAt,
          url: p.actionsStatus.url,
        }
      : null,
  };
}

// ---------------------------------------------------------------------------
// GET /api/projects
// ---------------------------------------------------------------------------

router.get("/api/projects", async (req: Request, res: Response) => {
  try {
    const { category, status, group, search, limit, offset } = req.query;

    const projects = await ProjectStore.getAllProjects({
      category: queryString(category),
      status: queryString(status),
      group: queryString(group),
      search: queryString(search),
      limit: queryInt(limit),
      offset: queryInt(offset),
    });

    res.json(projects.map(transformProject));
  } catch (err) {
    console.error("[projects] GET /api/projects error:", err);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/projects/stats
// ---------------------------------------------------------------------------

router.get("/api/projects/stats", async (_req: Request, res: Response) => {
  try {
    const raw = await ProjectStore.getStats();
    // Transform to match frontend expected shape
    const allProjects = await ProjectStore.getAllProjects();
    const languagesUsed = new Set<string>();
    for (const p of allProjects) {
      if (p.language) languagesUsed.add(p.language);
      for (const lang of Object.keys(p.languages)) {
        languagesUsed.add(lang);
      }
    }
    res.json({
      totalProjects: raw.totalRepos,
      activeProjects: raw.byStatus["active"] ?? 0,
      openPullRequests: raw.totalOpenPRs,
      recentCommits: raw.recentCommitsCount,
      languagesUsed: Array.from(languagesUsed),
      categoryCounts: raw.byCategory,
      statusCounts: raw.byStatus,
    });
  } catch (err) {
    console.error("[projects] GET /api/projects/stats error:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/projects/:id
// ---------------------------------------------------------------------------

router.get("/api/projects/:id", async (req: Request, res: Response) => {
  try {
    const id = paramString(req.params.id);
    const project = await ProjectStore.getProject(id);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.json(transformProject(project));
  } catch (err) {
    console.error("[projects] GET /api/projects/:id error:", err);
    res.status(500).json({ error: "Failed to fetch project" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/projects/discover
// ---------------------------------------------------------------------------

router.post("/api/projects/discover", async (_req: Request, res: Response) => {
  try {
    let projects;

    if (config.isDemoMode) {
      console.log("[discovery] Demo mode — loading mock projects");
      projects = getMockProjects();
    } else {
      console.log(
        `[discovery] Live mode — discovering repos in ${config.GITHUB_ORG}`
      );
      const octokit = createGitHubClient(config.GITHUB_PAT!);
      projects = await discoverProjects(octokit, config.GITHUB_ORG);
    }

    await ProjectStore.upsertMany(projects);

    res.json({
      message: `Discovered ${projects.length} projects`,
      count: projects.length,
      mode: config.isDemoMode ? "demo" : "live",
    });
  } catch (err) {
    console.error("[projects] POST /api/projects/discover error:", err);
    res.status(500).json({ error: "Discovery failed" });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/projects/:id/tags
// ---------------------------------------------------------------------------

router.patch(
  "/api/projects/:id/tags",
  async (req: Request, res: Response) => {
    try {
      const id = paramString(req.params.id);

      const parsed = ProjectTagsSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: "Invalid tag data",
          details: parsed.error.flatten(),
        });
        return;
      }

      const updated = await ProjectStore.updateProjectTags(id, parsed.data);

      if (!updated) {
        res.status(404).json({ error: "Project not found" });
        return;
      }

      const project = await ProjectStore.getProject(id);
      res.json(project ? transformProject(project) : null);
    } catch (err) {
      console.error("[projects] PATCH /api/projects/:id/tags error:", err);
      res.status(500).json({ error: "Failed to update tags" });
    }
  }
);

export default router;
