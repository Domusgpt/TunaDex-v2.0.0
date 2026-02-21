import { type FC, type ReactNode } from 'react';
import { SearchBar } from './SearchBar';
import { useProjectStore } from '../stores/project-store';
import { useDiscoverMutation } from '../hooks/useProjects';

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

const GridIcon: FC<{ active: boolean }> = ({ active }) => (
  <svg
    className={`h-4 w-4 ${active ? 'text-accent-cyan' : 'text-text-dim'}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
    />
  </svg>
);

const ListIcon: FC<{ active: boolean }> = ({ active }) => (
  <svg
    className={`h-4 w-4 ${active ? 'text-accent-cyan' : 'text-text-dim'}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"
    />
  </svg>
);

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

interface LayoutProps {
  children: ReactNode;
}

export const Layout: FC<LayoutProps> = ({ children }) => {
  const { view, setView } = useProjectStore();
  const discover = useDiscoverMutation();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ---- Sidebar ---- */}
      <aside className="w-[240px] bg-deep border-r border-text-dim/20 flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-5 py-6 border-b border-text-dim/15">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-accent-cyan/15 border border-accent-cyan/30 flex items-center justify-center">
              <svg className="h-4 w-4 text-accent-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-2.25-1.313M21 7.5v2.25m0-2.25l-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3l2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75l2.25-1.313M12 21.75V19.5m0 2.25l-2.25-1.313m0-16.875L12 2.25l2.25 1.313M21 14.25v2.25l-2.25 1.313m-13.5 0L3 16.5v-2.25" />
              </svg>
            </div>
            <div>
              <h1 className="font-heading text-sm font-bold text-text-primary tracking-wide leading-tight">
                Project
              </h1>
              <h1 className="font-heading text-sm font-bold text-accent-cyan tracking-wide leading-tight">
                Ontology
              </h1>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4">
          <div className="space-y-1">
            <a
              href="/"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-accent-cyan/10
                         text-accent-cyan text-sm font-body font-semibold transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
              Dashboard
            </a>
          </div>
        </nav>

        {/* Status indicator */}
        <div className="px-5 py-4 border-t border-text-dim/15">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-emerald opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-emerald" />
            </span>
            <span className="text-xs font-mono text-text-dim">Demo Mode</span>
          </div>
        </div>
      </aside>

      {/* ---- Main column ---- */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header className="bg-panel/80 backdrop-blur-md border-b border-text-dim/15 px-6 py-3 shrink-0">
          <div className="flex items-center gap-4">
            {/* Search bar */}
            <div className="flex-1 max-w-md">
              <SearchBar />
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* View toggle */}
            <div className="flex items-center bg-deep rounded-lg border border-text-dim/20 p-0.5">
              <button
                onClick={() => setView('grid')}
                className={`p-1.5 rounded-md transition-colors ${
                  view === 'grid' ? 'bg-accent-cyan/15' : 'hover:bg-panel'
                }`}
                title="Grid view"
              >
                <GridIcon active={view === 'grid'} />
              </button>
              <button
                onClick={() => setView('list')}
                className={`p-1.5 rounded-md transition-colors ${
                  view === 'list' ? 'bg-accent-cyan/15' : 'hover:bg-panel'
                }`}
                title="List view"
              >
                <ListIcon active={view === 'list'} />
              </button>
            </div>

            {/* Discover button */}
            <button
              onClick={() => discover.mutate()}
              disabled={discover.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-accent-cyan/15 border border-accent-cyan/30
                         rounded-lg text-sm font-mono text-accent-cyan hover:bg-accent-cyan/25
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                         shadow-[0_0_12px_rgba(0,245,255,0.08)]"
            >
              {discover.isPending ? (
                <div className="h-4 w-4 border-2 border-accent-cyan/30 border-t-accent-cyan rounded-full animate-spin" />
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.181-3.183" />
                </svg>
              )}
              Discover
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
