import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { search, searchByTags, searchByCategory } from '../../src/core/search.js';
import type { LocalIndex } from '../../src/core/types.js';

const FIXTURES = join(__dirname, '..', 'fixtures');
const sampleIndex: LocalIndex = JSON.parse(
  readFileSync(join(FIXTURES, 'sample-index.json'), 'utf-8'),
);

describe('search', () => {
  it('finds skills by query text', () => {
    const results = search(sampleIndex, { query: 'code review' });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].skill.name).toBe('code-reviewer');
  });

  it('finds skills by tag match', () => {
    const results = search(sampleIndex, { query: 'kubernetes' });
    expect(results.some((r) => r.skill.name === 'k8s-deployer')).toBe(true);
  });

  it('filters by category', () => {
    const results = search(sampleIndex, { query: 'data', category: 'data' });
    expect(results.every((r) => r.skill.category === 'data')).toBe(true);
  });

  it('filters by minimum rating', () => {
    const results = search(sampleIndex, { query: 'skill', minRating: 4.5 });
    expect(results.every((r) => r.skill.rating.average >= 4.5)).toBe(true);
  });

  it('filters by trust level', () => {
    const results = search(sampleIndex, { query: 'skill', trustLevel: 'official' });
    expect(results.every((r) => r.skill.trustLevel === 'official')).toBe(true);
  });

  it('respects limit', () => {
    const results = search(sampleIndex, { query: 'skill', limit: 2 });
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it('returns empty for no matches', () => {
    const results = search(sampleIndex, { query: 'zzzznonexistent' });
    expect(results).toEqual([]);
  });

  it('ranks exact name match higher', () => {
    const results = search(sampleIndex, { query: 'api-designer' });
    expect(results[0].skill.name).toBe('api-designer');
  });
});

describe('searchByTags', () => {
  it('finds skills by tags', () => {
    const results = searchByTags(sampleIndex, ['security']);
    expect(results.some((r) => r.skill.name === 'code-reviewer')).toBe(true);
  });
});

describe('searchByCategory', () => {
  it('returns all skills in a category', () => {
    const results = searchByCategory(sampleIndex, 'devops');
    expect(results.every((r) => r.skill.category === 'devops')).toBe(true);
    expect(results.length).toBe(1);
    expect(results[0].skill.name).toBe('k8s-deployer');
  });
});
