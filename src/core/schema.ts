import { z } from 'zod';

export const SkillCategorySchema = z.enum([
  'development',
  'creative',
  'enterprise',
  'data',
  'devops',
  'other',
]);

export const TrustLevelSchema = z.enum(['community', 'verified', 'official']);

export const SkillMetadataSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/, 'Must be lowercase alphanumeric with hyphens, not starting/ending with hyphen'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Must be valid semver (e.g. 1.0.0)'),
  description: z.string().min(10).max(500),
  author: z.string().min(1),
  license: z.string().min(1),
  tags: z.array(z.string().min(1).max(50)).min(1).max(20),
  category: SkillCategorySchema,
  repository: z.string().url().optional(),
  homepage: z.string().url().optional(),
  'min-skillli-version': z.string().optional(),
  'trust-level': TrustLevelSchema.default('community'),
  checksum: z.string().optional(),
  'disable-model-invocation': z.boolean().default(false),
  'user-invocable': z.boolean().default(true),
});

export type RawSkillMetadata = z.infer<typeof SkillMetadataSchema>;
