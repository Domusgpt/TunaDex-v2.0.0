import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { parseSkillFile, parseSkillContent, validateMetadata } from '../../src/core/parser.js';
import { SkillValidationError } from '../../src/core/errors.js';

const FIXTURES = join(__dirname, '..', 'fixtures');

describe('parseSkillFile', () => {
  it('parses a valid SKILL.md file', async () => {
    const skill = await parseSkillFile(join(FIXTURES, 'valid-skill', 'SKILL.md'));
    expect(skill.metadata.name).toBe('test-skill');
    expect(skill.metadata.version).toBe('1.0.0');
    expect(skill.metadata.author).toBe('testuser');
    expect(skill.metadata.tags).toEqual(['testing', 'validation']);
    expect(skill.metadata.category).toBe('development');
    expect(skill.metadata.trustLevel).toBe('community');
    expect(skill.metadata.userInvocable).toBe(true);
    expect(skill.content).toContain('# Test Skill');
  });

  it('throws SkillValidationError for invalid SKILL.md', async () => {
    await expect(
      parseSkillFile(join(FIXTURES, 'invalid-skill', 'SKILL.md')),
    ).rejects.toThrow(SkillValidationError);
  });
});

describe('parseSkillContent', () => {
  it('parses inline content', () => {
    const content = `---
name: inline-skill
version: 0.1.0
description: An inline skill for testing the parser directly
author: tester
license: MIT
tags: [test]
category: other
---

# Inline Skill

Body content here.`;

    const skill = parseSkillContent(content);
    expect(skill.metadata.name).toBe('inline-skill');
    expect(skill.metadata.version).toBe('0.1.0');
    expect(skill.metadata.license).toBe('MIT');
    expect(skill.content).toContain('# Inline Skill');
    expect(skill.filePath).toBe('<inline>');
  });

  it('applies defaults for optional fields', () => {
    const content = `---
name: minimal
version: 1.0.0
description: A minimal skill with only required fields present
author: someone
license: Apache-2.0
tags: [minimal]
category: other
---

Content.`;

    const skill = parseSkillContent(content);
    expect(skill.metadata.trustLevel).toBe('community');
    expect(skill.metadata.disableModelInvocation).toBe(false);
    expect(skill.metadata.userInvocable).toBe(true);
  });
});

describe('validateMetadata', () => {
  it('rejects invalid name format', () => {
    expect(() =>
      validateMetadata({
        name: 'INVALID_NAME!!',
        version: '1.0.0',
        description: 'A skill with an invalid name format',
        author: 'test',
        license: 'MIT',
        tags: ['test'],
        category: 'other',
      }),
    ).toThrow(SkillValidationError);
  });

  it('rejects invalid semver', () => {
    expect(() =>
      validateMetadata({
        name: 'test',
        version: 'not-semver',
        description: 'A skill with an invalid version string',
        author: 'test',
        license: 'MIT',
        tags: ['test'],
        category: 'other',
      }),
    ).toThrow(SkillValidationError);
  });

  it('rejects missing required fields', () => {
    expect(() => validateMetadata({ name: 'test' })).toThrow(SkillValidationError);
  });

  it('rejects invalid category', () => {
    expect(() =>
      validateMetadata({
        name: 'test',
        version: '1.0.0',
        description: 'A skill with an invalid category value',
        author: 'test',
        license: 'MIT',
        tags: ['test'],
        category: 'not-a-category',
      }),
    ).toThrow(SkillValidationError);
  });
});
