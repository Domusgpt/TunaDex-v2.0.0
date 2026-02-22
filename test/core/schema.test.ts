import { describe, it, expect } from 'vitest';
import { SkillMetadataSchema, SkillCategorySchema, TrustLevelSchema } from '../../src/core/schema.js';

describe('SkillCategorySchema', () => {
  it('accepts valid categories', () => {
    for (const cat of ['development', 'creative', 'enterprise', 'data', 'devops', 'other']) {
      expect(SkillCategorySchema.parse(cat)).toBe(cat);
    }
  });

  it('rejects invalid categories', () => {
    expect(() => SkillCategorySchema.parse('invalid')).toThrow();
  });
});

describe('TrustLevelSchema', () => {
  it('accepts valid trust levels', () => {
    for (const level of ['community', 'verified', 'official']) {
      expect(TrustLevelSchema.parse(level)).toBe(level);
    }
  });
});

describe('SkillMetadataSchema', () => {
  const validMetadata = {
    name: 'my-skill',
    version: '1.0.0',
    description: 'A valid skill for schema testing purposes',
    author: 'testuser',
    license: 'MIT',
    tags: ['test', 'validation'],
    category: 'development',
  };

  it('accepts valid metadata', () => {
    const result = SkillMetadataSchema.parse(validMetadata);
    expect(result.name).toBe('my-skill');
    expect(result['trust-level']).toBe('community');
    expect(result['user-invocable']).toBe(true);
  });

  it('accepts metadata with optional fields', () => {
    const result = SkillMetadataSchema.parse({
      ...validMetadata,
      repository: 'https://github.com/test/repo',
      'trust-level': 'verified',
      checksum: 'sha256:abc',
    });
    expect(result.repository).toBe('https://github.com/test/repo');
    expect(result['trust-level']).toBe('verified');
  });

  it('rejects name with uppercase', () => {
    expect(() => SkillMetadataSchema.parse({ ...validMetadata, name: 'MySkill' })).toThrow();
  });

  it('rejects name starting with hyphen', () => {
    expect(() => SkillMetadataSchema.parse({ ...validMetadata, name: '-bad' })).toThrow();
  });

  it('rejects empty tags array', () => {
    expect(() => SkillMetadataSchema.parse({ ...validMetadata, tags: [] })).toThrow();
  });

  it('rejects too-short description', () => {
    expect(() =>
      SkillMetadataSchema.parse({ ...validMetadata, description: 'short' }),
    ).toThrow();
  });

  it('accepts single-character name', () => {
    const result = SkillMetadataSchema.parse({ ...validMetadata, name: 'x' });
    expect(result.name).toBe('x');
  });
});
