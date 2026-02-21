import { useEffect, useRef, useState, type FC } from 'react';
import { useProjectStore } from '../stores/project-store';

export const SearchBar: FC = () => {
  const { searchQuery, setSearch, filters, setFilter } = useProjectStore();
  const [local, setLocal] = useState(searchQuery);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Sync store -> local when store is cleared externally
  useEffect(() => {
    setLocal(searchQuery);
  }, [searchQuery]);

  const handleChange = (value: string) => {
    setLocal(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setSearch(value), 300);
  };

  const activeFilters = Object.entries(filters).filter(
    ([, v]) => v !== undefined && v !== '',
  ) as [string, string][];

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        {/* Search icon */}
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-dim"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <input
          type="text"
          value={local}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Search projects..."
          className="w-full pl-10 pr-4 py-2 bg-deep border border-text-dim/30 rounded-lg
                     text-text-primary placeholder:text-text-dim font-body text-sm
                     focus:outline-none focus:border-accent-cyan/60 focus:ring-1 focus:ring-accent-cyan/30
                     transition-colors"
        />
        {local && (
          <button
            onClick={() => {
              setLocal('');
              setSearch('');
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-secondary transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activeFilters.map(([key, value]) => (
            <span
              key={key}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-cyan/10 border border-accent-cyan/30
                         rounded-full text-xs font-mono text-accent-cyan"
            >
              {key}: {value}
              <button
                onClick={() => setFilter(key as 'category' | 'status' | 'group', undefined)}
                className="hover:text-text-primary transition-colors"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
