import type { TrawlResult, RegistryEntry } from '../core/types.js';
import { getLocalIndex } from '../core/local-store.js';

export async function searchRegistry(query: string): Promise<TrawlResult[]> {
  const index = await getLocalIndex();
  const tokens = query.toLowerCase().split(/\s+/);
  const results: TrawlResult[] = [];

  for (const entry of Object.values(index.skills)) {
    const text = `${entry.name} ${entry.description} ${entry.tags.join(' ')}`.toLowerCase();
    const matchCount = tokens.filter((t) => text.includes(t)).length;
    if (matchCount === 0) continue;

    results.push({
      source: 'registry',
      skill: entry,
      confidence: Math.min(matchCount / tokens.length, 1),
      url: entry.repository || `skillli://registry/${entry.name}`,
    });
  }

  return results;
}

export async function searchGithub(query: string): Promise<TrawlResult[]> {
  const results: TrawlResult[] = [];
  const searchQuery = encodeURIComponent(`${query} SKILL.md in:path`);
  const url = `https://api.github.com/search/repositories?q=${searchQuery}&per_page=10`;

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/vnd.github.v3+json' },
    });
    if (!res.ok) return results;

    const data = (await res.json()) as {
      items: Array<{
        full_name: string;
        description: string;
        html_url: string;
        stargazers_count: number;
        topics: string[];
      }>;
    };

    for (const repo of data.items ?? []) {
      const confidence = Math.min(
        0.3 + (repo.stargazers_count > 10 ? 0.2 : 0) + (repo.stargazers_count > 100 ? 0.2 : 0),
        0.9,
      );

      results.push({
        source: 'github',
        skill: {
          name: repo.full_name.split('/').pop() ?? repo.full_name,
          description: repo.description ?? '',
          author: repo.full_name.split('/')[0],
          repository: repo.html_url,
          tags: repo.topics ?? [],
        } as Partial<RegistryEntry>,
        confidence,
        url: repo.html_url,
      });
    }
  } catch {
    // GitHub API may be unavailable — silently return empty
  }

  return results;
}

export async function searchNpm(query: string): Promise<TrawlResult[]> {
  const results: TrawlResult[] = [];
  const searchQuery = encodeURIComponent(`${query} skill agent claude`);
  const url = `https://registry.npmjs.org/-/v1/search?text=${searchQuery}&size=10`;

  try {
    const res = await fetch(url);
    if (!res.ok) return results;

    const data = (await res.json()) as {
      objects: Array<{
        package: {
          name: string;
          description: string;
          version: string;
          links: { repository?: string; npm: string };
          keywords?: string[];
        };
        score: { final: number };
      }>;
    };

    for (const obj of data.objects ?? []) {
      const pkg = obj.package;
      results.push({
        source: 'npm',
        skill: {
          name: pkg.name,
          description: pkg.description ?? '',
          version: pkg.version,
          repository: pkg.links.repository ?? '',
          tags: pkg.keywords ?? [],
        } as Partial<RegistryEntry>,
        confidence: Math.min(obj.score.final * 0.7, 0.85),
        url: pkg.links.npm,
      });
    }
  } catch {
    // npm API may be unavailable — silently return empty
  }

  return results;
}
