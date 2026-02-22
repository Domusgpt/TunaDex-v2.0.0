import type {
  LocalIndex,
  RegistryEntry,
  SearchOptions,
  SearchResult,
  SkillCategory,
} from './types.js';

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s\-_,./]+/)
    .filter((t) => t.length > 1);
}

function textScore(tokens: string[], text: string): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (lower.includes(token)) score += 1;
  }
  return score;
}

function scoreSkill(
  entry: RegistryEntry,
  queryTokens: string[],
  options: SearchOptions,
): { score: number; matchedOn: SearchResult['matchedOn'] } {
  let score = 0;
  const matchedOn: SearchResult['matchedOn'] = [];

  // Name match (highest weight)
  const nameScore = textScore(queryTokens, entry.name);
  if (nameScore > 0) {
    score += nameScore * 5;
    matchedOn.push('name');
  }

  // Exact name match bonus
  if (entry.name === options.query.toLowerCase()) {
    score += 10;
  }

  // Description match
  const descScore = textScore(queryTokens, entry.description);
  if (descScore > 0) {
    score += descScore * 2;
    matchedOn.push('description');
  }

  // Tag match (very high weight)
  for (const token of queryTokens) {
    if (entry.tags.some((t) => t.toLowerCase() === token)) {
      score += 4;
      if (!matchedOn.includes('tags')) matchedOn.push('tags');
    }
  }

  // Filter-matched tags from options
  if (options.tags) {
    for (const tag of options.tags) {
      if (entry.tags.includes(tag)) {
        score += 3;
        if (!matchedOn.includes('tags')) matchedOn.push('tags');
      }
    }
  }

  // Category match
  if (options.category && entry.category === options.category) {
    score += 2;
    matchedOn.push('category');
  }

  // Only apply boosts if there's at least one text/tag/category match
  if (matchedOn.length > 0) {
    // Trust level boost
    if (entry.trustLevel === 'official') score += 3;
    if (entry.trustLevel === 'verified') score += 1.5;

    // Rating boost
    score += entry.rating.average * 0.5;

    // Download boost (log scale)
    if (entry.downloads > 0) {
      score += Math.log10(entry.downloads) * 0.5;
    }
  }

  return { score, matchedOn };
}

export function search(index: LocalIndex, options: SearchOptions): SearchResult[] {
  const queryTokens = tokenize(options.query);
  const results: SearchResult[] = [];

  for (const entry of Object.values(index.skills)) {
    // Pre-filter by category
    if (options.category && entry.category !== options.category) continue;

    // Pre-filter by trust level
    if (options.trustLevel && entry.trustLevel !== options.trustLevel) continue;

    // Pre-filter by minimum rating
    if (options.minRating && entry.rating.average < options.minRating) continue;

    const { score, matchedOn } = scoreSkill(entry, queryTokens, options);

    if (score > 0) {
      results.push({ skill: entry, relevanceScore: score, matchedOn });
    }
  }

  // Sort by relevance (descending)
  results.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Apply offset and limit
  const offset = options.offset ?? 0;
  const limit = options.limit ?? 20;
  return results.slice(offset, offset + limit);
}

export function searchByTags(index: LocalIndex, tags: string[]): SearchResult[] {
  return search(index, { query: tags.join(' '), tags });
}

export function searchByCategory(index: LocalIndex, category: SkillCategory): SearchResult[] {
  return search(index, { query: '', category });
}
