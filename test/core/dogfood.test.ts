import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { readFileSync } from 'fs';
import { parseSkillFile, parseSkillContent } from '../../src/core/parser.js';
import { runSafeguards, computeTrustScore } from '../../src/core/safeguards.js';
import { packageSkill } from '../../src/core/publisher.js';
import { search } from '../../src/core/search.js';
import type { LocalIndex } from '../../src/core/types.js';

const SKILLLI_SKILL_DIR = join(__dirname, '..', '..', '.claude', 'skills', 'skillli');
const FIXTURES = join(__dirname, '..', 'fixtures');
const sampleIndex: LocalIndex = JSON.parse(
  readFileSync(join(FIXTURES, 'sample-index.json'), 'utf-8'),
);

describe('dogfood: skillli skill validates through its own system', () => {
  it('parses the skillli SKILL.md with all required fields', async () => {
    const skill = await parseSkillFile(join(SKILLLI_SKILL_DIR, 'SKILL.md'));
    expect(skill.metadata.name).toBe('skillli');
    expect(skill.metadata.version).toBe('0.1.0');
    expect(skill.metadata.author).toBe('domusgpt');
    expect(skill.metadata.license).toBe('MIT');
    expect(skill.metadata.category).toBe('development');
    expect(skill.metadata.trustLevel).toBe('official');
    expect(skill.metadata.tags).toContain('mcp');
    expect(skill.metadata.tags).toContain('claude');
    expect(skill.metadata.tags).toContain('skills');
    expect(skill.metadata.userInvocable).toBe(true);
  });

  it('passes all safeguard checks', async () => {
    const skill = await parseSkillFile(join(SKILLLI_SKILL_DIR, 'SKILL.md'));
    const result = await runSafeguards(skill, SKILLLI_SKILL_DIR);
    expect(result.passed).toBe(true);
    expect(result.checks.every((c) => c.passed)).toBe(true);
  });

  it('achieves trust score >= 55', async () => {
    const skill = await parseSkillFile(join(SKILLLI_SKILL_DIR, 'SKILL.md'));
    const score = computeTrustScore(skill);
    expect(score).toBeGreaterThanOrEqual(55);
  });

  it('packages successfully with valid manifest and checksum', async () => {
    const { skill, manifest, checksum } = await packageSkill(SKILLLI_SKILL_DIR);
    expect(skill.metadata.name).toBe('skillli');
    expect(manifest.name).toBe('skillli');
    expect(manifest.checksum).toMatch(/^sha256:/);
    expect(checksum).toHaveLength(64);
    expect(manifest.files).toContain('SKILL.md');
    expect(manifest.files).toContain('references/skill-format-spec.md');
  });

  it('is discoverable in the registry index via search', () => {
    const results = search(sampleIndex, { query: 'skillli' });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].skill.name).toBe('skillli');
  });

  it('is discoverable by tag "mcp"', () => {
    const results = search(sampleIndex, { query: 'mcp' });
    expect(results.some((r) => r.skill.name === 'skillli')).toBe(true);
  });

  it('is discoverable by tag "claude"', () => {
    const results = search(sampleIndex, { query: 'claude' });
    expect(results.some((r) => r.skill.name === 'skillli')).toBe(true);
  });

  it('appears when searching for "skill discovery"', () => {
    const results = search(sampleIndex, { query: 'skill discovery' });
    expect(results.some((r) => r.skill.name === 'skillli')).toBe(true);
  });
});
