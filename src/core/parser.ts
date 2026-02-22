import { readFile } from 'fs/promises';
import matter from 'gray-matter';
import { SkillMetadataSchema, type RawSkillMetadata } from './schema.js';
import { SkillValidationError } from './errors.js';
import type { SkillMetadata, ParsedSkill } from './types.js';

function normalizeMetadata(raw: RawSkillMetadata): SkillMetadata {
  return {
    name: raw.name,
    version: raw.version,
    description: raw.description,
    author: raw.author,
    license: raw.license,
    tags: raw.tags,
    category: raw.category,
    repository: raw.repository,
    homepage: raw.homepage,
    minSkillliVersion: raw['min-skillli-version'],
    trustLevel: raw['trust-level'],
    checksum: raw.checksum,
    disableModelInvocation: raw['disable-model-invocation'],
    userInvocable: raw['user-invocable'],
  };
}

export function validateMetadata(data: unknown): SkillMetadata {
  const result = SkillMetadataSchema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`,
    );
    throw new SkillValidationError('Invalid skill metadata', details);
  }
  return normalizeMetadata(result.data);
}

export function parseSkillContent(content: string, filePath = '<inline>'): ParsedSkill {
  const { data, content: body, matter: rawFrontmatter } = matter(content);
  const metadata = validateMetadata(data);
  return {
    metadata,
    content: body.trim(),
    rawFrontmatter: rawFrontmatter || '',
    filePath,
  };
}

export async function parseSkillFile(filePath: string): Promise<ParsedSkill> {
  const content = await readFile(filePath, 'utf-8');
  return parseSkillContent(content, filePath);
}

export function extractManifest(skill: ParsedSkill): Record<string, unknown> {
  const { metadata } = skill;
  return {
    name: metadata.name,
    version: metadata.version,
    description: metadata.description,
    author: metadata.author,
    license: metadata.license,
    tags: metadata.tags,
    category: metadata.category,
    repository: metadata.repository,
    trust_level: metadata.trustLevel,
    checksum: metadata.checksum,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
