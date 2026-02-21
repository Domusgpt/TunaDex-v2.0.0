import type { FC } from 'react';
import { useStats } from '../hooks/useProjects';

interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  accent?: string;
}

const StatCard: FC<StatCardProps> = ({ icon, value, label, accent = 'text-accent-cyan' }) => (
  <div
    className="flex items-center gap-3 px-4 py-3 bg-panel/60 border border-text-dim/10
               rounded-xl min-w-[160px]"
  >
    <div className={`${accent} opacity-80`}>{icon}</div>
    <div>
      <div className="text-xl font-heading font-bold text-text-primary leading-none">
        {value}
      </div>
      <div className="text-xs font-mono text-text-dim mt-0.5">{label}</div>
    </div>
  </div>
);

export const StatsBar: FC = () => {
  const { data: stats, isLoading } = useStats();

  if (isLoading || !stats) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-[68px] min-w-[160px] bg-panel/60 border border-text-dim/10
                       rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      <StatCard
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
          </svg>
        }
        value={stats.totalProjects}
        label="Total Projects"
        accent="text-accent-cyan"
      />
      <StatCard
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
        }
        value={stats.activeProjects}
        label="Active Projects"
        accent="text-accent-emerald"
      />
      <StatCard
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
        }
        value={stats.openPullRequests}
        label="Open PRs"
        accent="text-accent-violet"
      />
      <StatCard
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
          </svg>
        }
        value={stats.recentCommits}
        label="Commits (30d)"
        accent="text-accent-gold"
      />
      <StatCard
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
          </svg>
        }
        value={stats.languagesUsed.length}
        label="Languages"
        accent="text-accent-rose"
      />
    </div>
  );
};
