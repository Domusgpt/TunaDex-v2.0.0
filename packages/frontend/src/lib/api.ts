// ---------------------------------------------------------------------------
// Project Ontology — typed API client
// ---------------------------------------------------------------------------

export interface ProjectTags {
  category?: string;
  status?: string;
  priority?: string;
  group?: string;
  custom?: string[];
}

export interface Project {
  id: string;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  homepage: string | null;
  language: string | null;
  languages: Record<string, number>;
  stars: number;
  forks: number;
  openIssues: number;
  topics: string[];
  defaultBranch: string;
  isPrivate: boolean;
  isArchived: boolean;
  isFork: boolean;
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
  tags: ProjectTags;
  branches: Branch[];
  pullRequests: PullRequest[];
  recentCommits: Commit[];
  lastWorkflowRun: WorkflowRun | null;
}

export interface Branch {
  name: string;
  sha: string;
  lastCommitMessage: string;
  lastCommitDate: string;
  isProtected: boolean;
}

export interface PullRequest {
  number: number;
  title: string;
  state: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  labels: string[];
  draft: boolean;
}

export interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

export interface WorkflowRun {
  name: string;
  status: string;
  conclusion: string | null;
  branch: string;
  createdAt: string;
  url: string;
}

export interface ProjectStats {
  totalProjects: number;
  activeProjects: number;
  openPullRequests: number;
  recentCommits: number;
  languagesUsed: string[];
  categoryCounts: Record<string, number>;
  statusCounts: Record<string, number>;
}

export interface ProjectFilters {
  category?: string;
  status?: string;
  group?: string;
  search?: string;
}

// ---------------------------------------------------------------------------
// Fetch helper
// ---------------------------------------------------------------------------

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export function fetchProjects(filters?: ProjectFilters): Promise<Project[]> {
  const params = new URLSearchParams();
  if (filters?.category) params.set('category', filters.category);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.group) params.set('group', filters.group);
  if (filters?.search) params.set('search', filters.search);
  const qs = params.toString();
  return request<Project[]>(`/api/projects${qs ? `?${qs}` : ''}`);
}

export function fetchProject(id: string): Promise<Project> {
  return request<Project>(`/api/projects/${encodeURIComponent(id)}`);
}

export function fetchStats(): Promise<ProjectStats> {
  return request<ProjectStats>('/api/projects/stats');
}

export function triggerDiscovery(): Promise<{ message: string }> {
  return request<{ message: string }>('/api/projects/discover', {
    method: 'POST',
  });
}

export function updateTags(
  id: string,
  tags: ProjectTags,
): Promise<Project> {
  return request<Project>(
    `/api/projects/${encodeURIComponent(id)}/tags`,
    {
      method: 'PATCH',
      body: JSON.stringify(tags),
    },
  );
}
