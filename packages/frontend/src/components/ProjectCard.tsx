import type { FC } from 'react';
import type { Project } from '../lib/api';

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

function activityColor(pushedAt: string): { dot: string; glow: string } {
  const daysSincePush = Math.floor(
    (Date.now() - new Date(pushedAt).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysSincePush <= 7) return { dot: 'bg-accent-emerald', glow: 'shadow-accent-emerald/40' };
  if (daysSincePush <= 30) return { dot: 'bg-accent-gold', glow: 'shadow-accent-gold/40' };
  return { dot: 'bg-accent-rose', glow: 'shadow-accent-rose/40' };
}

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Rust: '#dea584',
  Go: '#00ADD8',
  Dart: '#00B4AB',
  Ruby: '#701516',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  Shell: '#89e051',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
};

function statusVariant(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-accent-emerald/15 text-accent-emerald border-accent-emerald/30';
    case 'beta':
      return 'bg-accent-violet/15 text-accent-violet border-accent-violet/30';
    case 'prototype':
      return 'bg-accent-gold/15 text-accent-gold border-accent-gold/30';
    case 'research':
      return 'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/30';
    case 'delivered':
      return 'bg-accent-emerald/15 text-accent-emerald border-accent-emerald/30';
    case 'archived':
      return 'bg-text-dim/15 text-text-dim border-text-dim/30';
    default:
      return 'bg-text-dim/15 text-text-secondary border-text-dim/30';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ProjectCardProps {
  project: Project;
  viewMode: 'grid' | 'list';
  onClick: () => void;
}

export const ProjectCard: FC<ProjectCardProps> = ({ project, viewMode, onClick }) => {
  const { dot, glow } = activityColor(project.pushedAt);
  const langColor = project.language ? LANGUAGE_COLORS[project.language] ?? '#888' : null;

  if (viewMode === 'list') {
    return (
      <button
        onClick={onClick}
        className="w-full text-left flex items-center gap-4 px-4 py-3 bg-panel border border-text-dim/20
                   rounded-xl hover:border-accent-cyan/40 transition-all duration-200 group"
      >
        {/* Activity dot */}
        <span className={`h-2 w-2 rounded-full shrink-0 ${dot} shadow-sm ${glow}`} />

        {/* Name */}
        <div className="min-w-[180px]">
          <span className="font-heading text-sm font-semibold text-text-primary group-hover:text-accent-cyan transition-colors">
            {project.name}
          </span>
          <span className="block text-xs font-mono text-text-dim">{project.fullName}</span>
        </div>

        {/* Description */}
        <p className="flex-1 text-sm text-text-secondary truncate">
          {project.description ?? 'No description'}
        </p>

        {/* Language */}
        {project.language && (
          <span className="flex items-center gap-1.5 text-xs font-mono text-text-secondary shrink-0">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: langColor ?? '#888' }}
            />
            {project.language}
          </span>
        )}

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs font-mono text-text-dim shrink-0">
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
            {project.stars}
          </span>
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
            </svg>
            {project.forks}
          </span>
        </div>

        {/* Tags */}
        <div className="flex items-center gap-1.5 shrink-0">
          {project.tags.category && (
            <span className="px-2 py-0.5 text-[10px] font-mono bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 rounded-full">
              {project.tags.category}
            </span>
          )}
          {project.tags.status && (
            <span className={`px-2 py-0.5 text-[10px] font-mono border rounded-full ${statusVariant(project.tags.status)}`}>
              {project.tags.status}
            </span>
          )}
        </div>

        {/* Last push */}
        <span className="text-xs font-mono text-text-dim shrink-0 w-16 text-right">
          {relativeTime(project.pushedAt)}
        </span>
      </button>
    );
  }

  // Grid view
  return (
    <button
      onClick={onClick}
      className="text-left flex flex-col bg-panel border border-text-dim/20 rounded-xl p-5
                 hover:border-accent-cyan/40 hover:shadow-[0_0_20px_rgba(0,245,255,0.06)]
                 transition-all duration-200 group h-full"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <h3 className="font-heading text-sm font-semibold text-text-primary group-hover:text-accent-cyan transition-colors truncate">
            {project.name}
          </h3>
          <p className="text-xs font-mono text-text-dim truncate">{project.fullName}</p>
        </div>
        <span className={`h-2.5 w-2.5 rounded-full shrink-0 mt-1 ${dot} shadow-sm ${glow}`} />
      </div>

      {/* Description */}
      <p className="text-sm text-text-secondary line-clamp-2 mb-3 flex-1 font-body">
        {project.description ?? 'No description'}
      </p>

      {/* Language */}
      {project.language && (
        <div className="flex items-center gap-1.5 mb-3">
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: langColor ?? '#888' }}
          />
          <span className="text-xs font-mono text-text-secondary">{project.language}</span>
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs font-mono text-text-dim mb-3">
        <span className="flex items-center gap-1">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
          {project.stars}
        </span>
        <span className="flex items-center gap-1">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
          </svg>
          {project.forks}
        </span>
        <span className="flex items-center gap-1">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {project.openIssues}
        </span>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {project.tags.category && (
          <span className="px-2 py-0.5 text-[10px] font-mono bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 rounded-full">
            {project.tags.category}
          </span>
        )}
        {project.tags.status && (
          <span className={`px-2 py-0.5 text-[10px] font-mono border rounded-full ${statusVariant(project.tags.status)}`}>
            {project.tags.status}
          </span>
        )}
        {project.tags.priority && (
          <span
            className={`px-2 py-0.5 text-[10px] font-mono border rounded-full ${
              project.tags.priority === 'high'
                ? 'bg-accent-rose/15 text-accent-rose border-accent-rose/30'
                : project.tags.priority === 'medium'
                  ? 'bg-accent-gold/15 text-accent-gold border-accent-gold/30'
                  : 'bg-text-dim/15 text-text-dim border-text-dim/30'
            }`}
          >
            {project.tags.priority}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-text-dim/10">
        <span className="text-[11px] font-mono text-text-dim">
          pushed {relativeTime(project.pushedAt)}
        </span>
        {project.isPrivate && (
          <span className="text-[10px] font-mono text-text-dim flex items-center gap-1">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            private
          </span>
        )}
      </div>
    </button>
  );
};
