import { create } from 'zustand';

export interface ProjectFiltersUI {
  category?: string;
  status?: string;
  group?: string;
}

interface ProjectStoreState {
  view: 'grid' | 'list';
  searchQuery: string;
  filters: ProjectFiltersUI;
  selectedProjectId: string | null;

  setView: (view: 'grid' | 'list') => void;
  setSearch: (query: string) => void;
  setFilter: (key: keyof ProjectFiltersUI, value: string | undefined) => void;
  clearFilters: () => void;
  selectProject: (id: string | null) => void;
  clearSelection: () => void;
}

export const useProjectStore = create<ProjectStoreState>((set) => ({
  view: 'grid',
  searchQuery: '',
  filters: {},
  selectedProjectId: null,

  setView: (view) => set({ view }),

  setSearch: (searchQuery) => set({ searchQuery }),

  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value || undefined },
    })),

  clearFilters: () => set({ filters: {}, searchQuery: '' }),

  selectProject: (selectedProjectId) => set({ selectedProjectId }),

  clearSelection: () => set({ selectedProjectId: null }),
}));
