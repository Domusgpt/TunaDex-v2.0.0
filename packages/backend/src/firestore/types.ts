export interface Branch {
  name: string;
  isDefault: boolean;
  lastCommitSha: string;
  lastCommitDate: string;
}

export interface PullRequest {
  number: number;
  title: string;
  state: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  url: string;
  labels: string[];
}

export interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

export interface ActionsRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  url: string;
  createdAt: string;
}

export interface ProjectTags {
  category: string;
  status: string;
  priority: string;
  group: string;
  custom: string[];
}

export interface Project {
  id: string;
  fullName: string;
  description: string;
  url: string;
  homepage: string | null;
  language: string | null;
  languages: Record<string, number>;
  topics: string[];
  visibility: string;
  defaultBranch: string;
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
  stars: number;
  forks: number;
  openIssues: number;
  branches: Branch[];
  openPRs: PullRequest[];
  recentCommits: Commit[];
  actionsStatus: ActionsRun | null;
  tags: ProjectTags;
  lastDiscoveredAt: string;
  lastEnrichedAt: string;
}
