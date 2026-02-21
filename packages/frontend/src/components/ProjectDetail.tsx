import { useState, type FC } from 'react';
import { useProject } from '../hooks/useProjects';
import { TagEditor } from './TagEditor';
import type { Branch, PullRequest, Commit, WorkflowRun, Project } from '../lib/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffYear > 0) return `${diffYear}y ago`;
  if (diffMonth > 0) return `${diffMonth}mo ago`;
  if (diffDay > 0) return `${diffDay}d ago`;
  if (diffHr > 0) return `${diffHr}h ago`;
  if (diffMin > 0) return `${diffMin}m ago`;
  return 'just now';
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

type Tab = 'overview' | 'branches' | 'prs' | 'commits' | 'actions';

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'branches', label: 'Branches' },
  { key: 'prs', label: 'Pull Requests' },
  { key: 'commits', label: 'Commits' },
  { key: 'actions', label: 'Actions' },
];

// ---------------------------------------------------------------------------
// Tab content panels
// ---------------------------------------------------------------------------

const OverviewTab: FC<{ project: Project }> = ({ project }) => {
  const totalBytes = Object.values(project.languages).reduce((a, b) => a + b, 0);
  const langEntries = Object.entries(project.languages)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  const LANG_COLORS: Record<string, string> = {
    TypeScript: '#3178c6', JavaScript: '#f1e05a', Python: '#3572A5',
    Rust: '#dea584', Go: '#00ADD8', Dart: '#00B4AB', Ruby: '#701516',
    Java: '#b07219', 'C++': '#f34b7d', C: '#555', Shell: '#89e051',
    HTML: '#e34c26', CSS: '#563d7c', Swift: '#F05138', Kotlin: '#A97BFF',
  };

  return (
    <div className="space-y-6">
      {/* Language breakdown */}
      {langEntries.length > 0 && (
        <div>
          <h4 className="text-xs font-mono text-text-dim uppercase tracking-wider mb-3">Languages</h4>
          {/* Bar */}
          <div className="flex h-2.5 rounded-full overflow-hidden mb-3">
            {langEntries.map(([lang, bytes]) => (
              <div
                key={lang}
                style={{
                  width: `${(bytes / totalBytes) * 100}%`,
                  backgroundColor: LANG_COLORS[lang] ?? '#666',
                }}
                title={`${lang}: ${((bytes / totalBytes) * 100).toFixed(1)}%`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            {langEntries.map(([lang, bytes]) => (
              <span key={lang} className="flex items-center gap-1.5 text-xs font-mono text-text-secondary">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: LANG_COLORS[lang] ?? '#666' }}
                />
                {lang}
                <span className="text-text-dim">{((bytes / totalBytes) * 100).toFixed(1)}%</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Topics */}
      {project.topics.length > 0 && (
        <div>
          <h4 className="text-xs font-mono text-text-dim uppercase tracking-wider mb-2">Topics</h4>
          <div className="flex flex-wrap gap-1.5">
            {project.topics.map((topic) => (
              <span
                key={topic}
                className="px-2 py-0.5 bg-accent-violet/10 border border-accent-violet/20
                           rounded-full text-xs font-mono text-accent-violet"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Key dates */}
      <div>
        <h4 className="text-xs font-mono text-text-dim uppercase tracking-wider mb-2">Key Dates</h4>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-void/50 rounded-lg p-3">
            <div className="text-xs font-mono text-text-dim mb-1">Created</div>
            <div className="text-sm font-body text-text-primary">{formatDate(project.createdAt)}</div>
          </div>
          <div className="bg-void/50 rounded-lg p-3">
            <div className="text-xs font-mono text-text-dim mb-1">Updated</div>
            <div className="text-sm font-body text-text-primary">{formatDate(project.updatedAt)}</div>
          </div>
          <div className="bg-void/50 rounded-lg p-3">
            <div className="text-xs font-mono text-text-dim mb-1">Last Push</div>
            <div className="text-sm font-body text-text-primary">{formatDate(project.pushedAt)}</div>
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-2 text-xs font-mono text-text-dim">
        <span className="px-2 py-1 bg-void/50 rounded">Branch: {project.defaultBranch}</span>
        {project.isPrivate && <span className="px-2 py-1 bg-void/50 rounded">Private</span>}
        {project.isArchived && <span className="px-2 py-1 bg-accent-rose/10 text-accent-rose rounded">Archived</span>}
        {project.isFork && <span className="px-2 py-1 bg-void/50 rounded">Fork</span>}
      </div>
    </div>
  );
};

const BranchesTab: FC<{ branches: Branch[] }> = ({ branches }) => {
  if (branches.length === 0) {
    return <p className="text-sm text-text-dim font-mono py-8 text-center">No branch data available</p>;
  }
  return (
    <div className="space-y-2">
      {branches.map((b) => (
        <div
          key={b.name}
          className="flex items-center gap-3 px-3 py-2.5 bg-void/50 rounded-lg"
        >
          <svg className="h-4 w-4 text-accent-emerald shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
          </svg>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-text-primary truncate">{b.name}</span>
              {b.isProtected && (
                <span className="text-[10px] px-1.5 py-0.5 bg-accent-gold/15 text-accent-gold border border-accent-gold/30 rounded-full">
                  protected
                </span>
              )}
            </div>
            <p className="text-xs text-text-dim truncate mt-0.5">{b.lastCommitMessage}</p>
          </div>
          <span className="text-xs font-mono text-text-dim shrink-0">
            {relativeTime(b.lastCommitDate)}
          </span>
        </div>
      ))}
    </div>
  );
};

const PRsTab: FC<{ prs: PullRequest[] }> = ({ prs }) => {
  if (prs.length === 0) {
    return <p className="text-sm text-text-dim font-mono py-8 text-center">No pull requests</p>;
  }
  return (
    <div className="space-y-2">
      {prs.map((pr) => (
        <div
          key={pr.number}
          className="flex items-start gap-3 px-3 py-2.5 bg-void/50 rounded-lg"
        >
          <svg
            className={`h-4 w-4 shrink-0 mt-0.5 ${
              pr.state === 'open' ? 'text-accent-emerald' :
              pr.state === 'closed' ? 'text-accent-rose' : 'text-accent-violet'
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-primary">
                {pr.title}
                {pr.draft && <span className="ml-1.5 text-[10px] text-text-dim">(draft)</span>}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-mono text-text-dim">#{pr.number}</span>
              <span className="text-xs text-text-dim">by {pr.author}</span>
              <span className="text-xs font-mono text-text-dim">{relativeTime(pr.createdAt)}</span>
            </div>
            {pr.labels.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {pr.labels.map((label) => (
                  <span
                    key={label}
                    className="px-1.5 py-0.5 text-[10px] font-mono bg-accent-cyan/10 text-accent-cyan
                               border border-accent-cyan/20 rounded-full"
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const CommitsTab: FC<{ commits: Commit[] }> = ({ commits }) => {
  if (commits.length === 0) {
    return <p className="text-sm text-text-dim font-mono py-8 text-center">No recent commits</p>;
  }
  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-[7px] top-3 bottom-3 w-px bg-text-dim/20" />
      <div className="space-y-1">
        {commits.map((c) => (
          <div key={c.sha} className="flex items-start gap-3 px-0 py-2 relative">
            <div className="h-[15px] w-[15px] rounded-full bg-deep border-2 border-accent-cyan/50 shrink-0 z-10" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-primary truncate">{c.message}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] font-mono text-accent-cyan/70">{c.sha.slice(0, 7)}</span>
                <span className="text-xs text-text-dim">{c.author}</span>
                <span className="text-xs font-mono text-text-dim">{relativeTime(c.date)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ActionsTab: FC<{ run: WorkflowRun | null }> = ({ run }) => {
  if (!run) {
    return <p className="text-sm text-text-dim font-mono py-8 text-center">No workflow runs found</p>;
  }

  const statusColor =
    run.conclusion === 'success'
      ? 'text-accent-emerald'
      : run.conclusion === 'failure'
        ? 'text-accent-rose'
        : 'text-accent-gold';

  return (
    <div className="bg-void/50 rounded-lg p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className={`h-3 w-3 rounded-full ${
          run.conclusion === 'success' ? 'bg-accent-emerald' :
          run.conclusion === 'failure' ? 'bg-accent-rose' : 'bg-accent-gold'
        }`} />
        <div>
          <h4 className="text-sm font-heading text-text-primary">{run.name}</h4>
          <p className="text-xs font-mono text-text-dim">on {run.branch}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
        <div>
          <span className="text-text-dim">Status: </span>
          <span className={statusColor}>{run.status}</span>
        </div>
        <div>
          <span className="text-text-dim">Conclusion: </span>
          <span className={statusColor}>{run.conclusion ?? 'pending'}</span>
        </div>
        <div>
          <span className="text-text-dim">Started: </span>
          <span className="text-text-secondary">{relativeTime(run.createdAt)}</span>
        </div>
        <div>
          <a
            href={run.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-cyan hover:text-accent-cyan/80 underline transition-colors"
          >
            View on GitHub
          </a>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// ProjectDetail
// ---------------------------------------------------------------------------

interface ProjectDetailProps {
  projectId: string;
  onClose: () => void;
}

export const ProjectDetail: FC<ProjectDetailProps> = ({ projectId, onClose }) => {
  const { data: project, isLoading, isError } = useProject(projectId);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-void/80 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-deep rounded-2xl border border-text-dim/20
                   shadow-2xl shadow-void/80 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Loading / Error */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 border-2 border-accent-cyan/30 border-t-accent-cyan rounded-full animate-spin" />
          </div>
        )}
        {isError && (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <p className="text-accent-rose font-mono text-sm">Failed to load project</p>
            <button onClick={onClose} className="text-xs text-text-dim hover:text-text-secondary">Close</button>
          </div>
        )}

        {project && (
          <>
            {/* Header */}
            <div className="p-6 border-b border-text-dim/15 shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="font-heading text-xl font-bold text-text-primary">{project.name}</h2>
                  <p className="text-sm text-text-secondary mt-1 font-body">
                    {project.description ?? 'No description'}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <a
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-mono text-accent-cyan
                                 hover:text-accent-cyan/80 transition-colors"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                      GitHub
                    </a>
                    {project.homepage && (
                      <a
                        href={project.homepage}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-mono text-accent-violet
                                   hover:text-accent-violet/80 transition-colors"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                        </svg>
                        Homepage
                      </a>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 text-text-dim hover:text-text-secondary rounded-lg
                             hover:bg-panel transition-colors shrink-0"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content area with sidebar */}
            <div className="flex flex-1 overflow-hidden">
              {/* Main content */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-text-dim/15 px-6 shrink-0">
                  {TABS.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`px-4 py-3 text-xs font-mono border-b-2 transition-colors ${
                        activeTab === tab.key
                          ? 'text-accent-cyan border-accent-cyan'
                          : 'text-text-dim border-transparent hover:text-text-secondary'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {activeTab === 'overview' && <OverviewTab project={project} />}
                  {activeTab === 'branches' && <BranchesTab branches={project.branches} />}
                  {activeTab === 'prs' && <PRsTab prs={project.pullRequests} />}
                  {activeTab === 'commits' && <CommitsTab commits={project.recentCommits} />}
                  {activeTab === 'actions' && <ActionsTab run={project.lastWorkflowRun} />}
                </div>
              </div>

              {/* Right sidebar — Tag Editor */}
              <div className="w-[280px] border-l border-text-dim/15 p-5 overflow-y-auto shrink-0">
                <TagEditor projectId={projectId} currentTags={project.tags} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
