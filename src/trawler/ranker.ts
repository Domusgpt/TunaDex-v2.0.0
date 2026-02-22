import type { TrawlResult } from '../core/types.js';

export function deduplicateResults(results: TrawlResult[]): TrawlResult[] {
  const seen = new Map<string, TrawlResult>();

  for (const result of results) {
    const key = result.skill.name?.toLowerCase() ?? result.url;
    const existing = seen.get(key);
    if (!existing || result.confidence > existing.confidence) {
      seen.set(key, result);
    }
  }

  return Array.from(seen.values());
}

export function rankResults(results: TrawlResult[], query: string): TrawlResult[] {
  const tokens = query.toLowerCase().split(/\s+/);

  return results
    .map((result) => {
      let bonus = 0;

      // Source trust bonus
      if (result.source === 'registry') bonus += 0.2;
      else if (result.source === 'github') bonus += 0.05;

      // Name relevance bonus
      const name = (result.skill.name ?? '').toLowerCase();
      for (const token of tokens) {
        if (name.includes(token)) bonus += 0.15;
      }

      // Tag match bonus
      const tags = (result.skill.tags ?? []).map((t) => t.toLowerCase());
      for (const token of tokens) {
        if (tags.includes(token)) bonus += 0.1;
      }

      return {
        ...result,
        confidence: Math.min(result.confidence + bonus, 1),
      };
    })
    .sort((a, b) => b.confidence - a.confidence);
}
