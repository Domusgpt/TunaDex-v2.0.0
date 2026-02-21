import { Octokit } from "@octokit/rest";
import { listOrgRepos } from "./client.js";
import type {
  Project,
  Branch,
  PullRequest,
  Commit,
  ActionsRun,
  ProjectTags,
} from "../firestore/types.js";

type OrgRepo = Awaited<ReturnType<typeof listOrgRepos>>[number];

const emptyTags: ProjectTags = {
  category: "",
  status: "",
  priority: "",
  group: "",
  custom: [],
};

/**
 * Discover all projects in a GitHub org and enrich them with metadata.
 */
export async function discoverProjects(
  octokit: Octokit,
  org: string
): Promise<Project[]> {
  const repos = await listOrgRepos(octokit, org);
  const now = new Date().toISOString();

  const projectPromises = repos.map((repo) =>
    enrichRepo(octokit, org, repo, now)
  );

  const settled = await Promise.allSettled(projectPromises);

  const projects: Project[] = [];
  for (const result of settled) {
    if (result.status === "fulfilled") {
      projects.push(result.value);
    } else {
      console.error("[discovery] Failed to enrich repo:", result.reason);
    }
  }

  return projects;
}

async function enrichRepo(
  octokit: Octokit,
  org: string,
  repo: OrgRepo,
  now: string
): Promise<Project> {
  const owner = org;
  const repoName = repo.name;
  const defaultBranch = repo.default_branch ?? "main";

  const [branchesResult, prsResult, commitsResult, actionsResult, langsResult] =
    await Promise.allSettled([
      fetchBranches(octokit, owner, repoName, defaultBranch),
      fetchOpenPRs(octokit, owner, repoName),
      fetchRecentCommits(octokit, owner, repoName, defaultBranch),
      fetchLatestActionsRun(octokit, owner, repoName),
      fetchLanguages(octokit, owner, repoName),
    ]);

  const branches: Branch[] =
    branchesResult.status === "fulfilled" ? branchesResult.value : [];
  const openPRs: PullRequest[] =
    prsResult.status === "fulfilled" ? prsResult.value : [];
  const recentCommits: Commit[] =
    commitsResult.status === "fulfilled" ? commitsResult.value : [];
  const actionsStatus: ActionsRun | null =
    actionsResult.status === "fulfilled" ? actionsResult.value : null;
  const languages: Record<string, number> =
    langsResult.status === "fulfilled" ? langsResult.value : {};

  return {
    id: repoName,
    fullName: repo.full_name,
    description: repo.description ?? "",
    url: repo.html_url,
    homepage: repo.homepage ?? null,
    language: repo.language ?? null,
    languages,
    topics: repo.topics ?? [],
    visibility: repo.visibility ?? (repo.private ? "private" : "public"),
    defaultBranch,
    createdAt: repo.created_at ?? now,
    updatedAt: repo.updated_at ?? now,
    pushedAt: repo.pushed_at ?? now,
    stars: repo.stargazers_count ?? 0,
    forks: repo.forks_count ?? 0,
    openIssues: repo.open_issues_count ?? 0,
    branches,
    openPRs,
    recentCommits,
    actionsStatus,
    tags: { ...emptyTags },
    lastDiscoveredAt: now,
    lastEnrichedAt: now,
  };
}

async function fetchBranches(
  octokit: Octokit,
  owner: string,
  repo: string,
  defaultBranch: string
): Promise<Branch[]> {
  const { data } = await octokit.repos.listBranches({
    owner,
    repo,
    per_page: 30,
  });

  return data.map((b) => ({
    name: b.name,
    isDefault: b.name === defaultBranch,
    lastCommitSha: b.commit.sha,
    lastCommitDate: "", // branch list doesn't include commit date
  }));
}

async function fetchOpenPRs(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<PullRequest[]> {
  const { data } = await octokit.pulls.list({
    owner,
    repo,
    state: "open",
    sort: "updated",
    direction: "desc",
    per_page: 10,
  });

  return data.map((pr) => ({
    number: pr.number,
    title: pr.title,
    state: pr.state,
    author: pr.user?.login ?? "unknown",
    createdAt: pr.created_at,
    updatedAt: pr.updated_at,
    url: pr.html_url,
    labels: pr.labels.map((l) => (typeof l === "string" ? l : l.name ?? "")),
  }));
}

async function fetchRecentCommits(
  octokit: Octokit,
  owner: string,
  repo: string,
  defaultBranch: string
): Promise<Commit[]> {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const { data } = await octokit.repos.listCommits({
    owner,
    repo,
    sha: defaultBranch,
    since: since.toISOString(),
    per_page: 20,
  });

  return data.map((c) => ({
    sha: c.sha,
    message: c.commit.message,
    author: c.commit.author?.name ?? c.author?.login ?? "unknown",
    date: c.commit.author?.date ?? "",
    url: c.html_url,
  }));
}

async function fetchLatestActionsRun(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<ActionsRun | null> {
  try {
    const { data } = await octokit.actions.listWorkflowRunsForRepo({
      owner,
      repo,
      per_page: 1,
    });

    if (data.workflow_runs.length === 0) {
      return null;
    }

    const run = data.workflow_runs[0];
    return {
      id: run.id,
      name: run.name ?? "workflow",
      status: run.status ?? "unknown",
      conclusion: run.conclusion ?? null,
      url: run.html_url,
      createdAt: run.created_at,
    };
  } catch {
    // Actions may not be enabled for this repo
    return null;
  }
}

async function fetchLanguages(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<Record<string, number>> {
  const { data } = await octokit.repos.listLanguages({
    owner,
    repo,
  });
  return data;
}
