import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchProjects,
  fetchProject,
  fetchStats,
  triggerDiscovery,
  updateTags,
  type ProjectFilters,
  type ProjectTags,
} from '../lib/api';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const keys = {
  all: ['projects'] as const,
  list: (filters?: ProjectFilters) => [...keys.all, 'list', filters] as const,
  detail: (id: string) => [...keys.all, 'detail', id] as const,
  stats: ['projects', 'stats'] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useProjects(filters?: ProjectFilters) {
  return useQuery({
    queryKey: keys.list(filters),
    queryFn: () => fetchProjects(filters),
    refetchInterval: 30_000,
  });
}

export function useProject(id: string | null) {
  return useQuery({
    queryKey: keys.detail(id ?? ''),
    queryFn: () => fetchProject(id!),
    enabled: !!id,
  });
}

export function useStats() {
  return useQuery({
    queryKey: keys.stats,
    queryFn: fetchStats,
    refetchInterval: 30_000,
  });
}

export function useDiscoverMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: triggerDiscovery,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all });
      qc.invalidateQueries({ queryKey: keys.stats });
    },
  });
}

export function useUpdateTagsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, tags }: { id: string; tags: ProjectTags }) =>
      updateTags(id, tags),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: keys.detail(variables.id) });
      qc.invalidateQueries({ queryKey: keys.list() });
      qc.invalidateQueries({ queryKey: keys.stats });
    },
  });
}
