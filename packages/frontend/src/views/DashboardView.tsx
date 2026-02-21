import { useMemo, type FC } from 'react';
import { StatsBar } from '../components/StatsBar';
import { ProjectCard } from '../components/ProjectCard';
import { ProjectDetail } from '../components/ProjectDetail';
import { useProjects } from '../hooks/useProjects';
import { useProjectStore } from '../stores/project-store';

// ---------------------------------------------------------------------------
// Filter constants
// ---------------------------------------------------------------------------

const CATEGORY_OPTIONS = [
  'geometric', 'vib34d', 'flutter', 'agent',
  'creative', 'research', 'business', 'infra',
];

const STATUS_OPTIONS = [
  'active', 'beta', 'prototype', 'research', 'delivered', 'archived',
];

// ---------------------------------------------------------------------------
// DashboardView
// ---------------------------------------------------------------------------

export const DashboardView: FC = () => {
  const { view, searchQuery, filters, setFilter, clearFilters, selectedProjectId, selectProject, clearSelection } =
    useProjectStore();

  const apiFilters = useMemo(
    () => ({
      ...filters,
      search: searchQuery || undefined,
    }),
    [filters, searchQuery],
  );

  const { data: projects, isLoading, isError } = useProjects(apiFilters);

  const hasActiveFilters =
    !!filters.category || !!filters.status || !!filters.group || !!searchQuery;

  return (
    <div className="p-6 space-y-6">
      {/* Stats */}
      <StatsBar />

      {/* Filter row */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono text-text-dim uppercase tracking-wider mr-1">Category:</span>
          {CATEGORY_OPTIONS.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter('category', filters.category === cat ? undefined : cat)}
              className={`px-2.5 py-1 text-xs font-mono rounded-lg border transition-colors ${
                filters.category === cat
                  ? 'bg-accent-cyan/15 border-accent-cyan/40 text-accent-cyan'
                  : 'bg-deep border-text-dim/20 text-text-dim hover:border-text-dim/40 hover:text-text-secondary'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono text-text-dim uppercase tracking-wider mr-1">Status:</span>
          {STATUS_OPTIONS.map((st) => (
            <button
              key={st}
              onClick={() => setFilter('status', filters.status === st ? undefined : st)}
              className={`px-2.5 py-1 text-xs font-mono rounded-lg border transition-colors ${
                filters.status === st
                  ? 'bg-accent-violet/15 border-accent-violet/40 text-accent-violet'
                  : 'bg-deep border-text-dim/20 text-text-dim hover:border-text-dim/40 hover:text-text-secondary'
              }`}
            >
              {st}
            </button>
          ))}

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-2.5 py-1 text-xs font-mono rounded-lg border border-accent-rose/30
                         text-accent-rose hover:bg-accent-rose/10 transition-colors ml-2"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 border-2 border-accent-cyan/30 border-t-accent-cyan rounded-full animate-spin" />
            <span className="text-sm font-mono text-text-dim">Loading projects...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <svg className="h-10 w-10 text-accent-rose/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p className="text-sm font-mono text-accent-rose">Failed to load projects</p>
          <p className="text-xs text-text-dim">Check that the backend is running on port 3001</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && projects?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <svg className="h-12 w-12 text-text-dim/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          </svg>
          <p className="text-sm font-mono text-text-dim">No projects found</p>
          <p className="text-xs text-text-dim">Try adjusting your filters or run discovery</p>
        </div>
      )}

      {/* Project grid / list */}
      {projects && projects.length > 0 && (
        view === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                viewMode="grid"
                onClick={() => selectProject(project.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                viewMode="list"
                onClick={() => selectProject(project.id)}
              />
            ))}
          </div>
        )
      )}

      {/* Project detail modal */}
      {selectedProjectId && (
        <ProjectDetail
          projectId={selectedProjectId}
          onClose={clearSelection}
        />
      )}
    </div>
  );
};
