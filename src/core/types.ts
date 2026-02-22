// === Skill Categories & Trust Levels ===

export type SkillCategory =
  | 'development'
  | 'creative'
  | 'enterprise'
  | 'data'
  | 'devops'
  | 'other';

export type TrustLevel = 'community' | 'verified' | 'official';

// === Skill Metadata (parsed from SKILL.md frontmatter) ===

export interface SkillMetadata {
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  tags: string[];
  category: SkillCategory;
  repository?: string;
  homepage?: string;
  minSkillliVersion?: string;
  trustLevel: TrustLevel;
  checksum?: string;
  disableModelInvocation?: boolean;
  userInvocable?: boolean;
}

// === Parsed Skill (metadata + content) ===

export interface ParsedSkill {
  metadata: SkillMetadata;
  content: string;
  rawFrontmatter: string;
  filePath: string;
}

// === Rating ===

export interface RatingInfo {
  average: number;
  count: number;
  distribution: [number, number, number, number, number];
}

export interface RatingSubmission {
  skillName: string;
  rating: number;
  userId: string;
  comment?: string;
  timestamp: string;
}

// === Registry Index Entry ===

export interface RegistryEntry {
  name: string;
  version: string;
  description: string;
  author: string;
  tags: string[];
  category: SkillCategory;
  repository: string;
  trustLevel: TrustLevel;
  downloads: number;
  rating: RatingInfo;
  publishedAt: string;
  updatedAt: string;
  checksum: string;
}

// === Local Store ===

export interface LocalIndex {
  version: string;
  lastUpdated: string;
  skills: Record<string, RegistryEntry>;
}

export interface InstalledSkill {
  name: string;
  version: string;
  installedAt: string;
  path: string;
  source: 'registry' | 'local' | 'github';
}

export interface LocalConfig {
  installedSkills: Record<string, InstalledSkill>;
  registryUrl: string;
  lastSync: string;
  userId?: string;
}

// === Search ===

export interface SearchOptions {
  query: string;
  tags?: string[];
  category?: SkillCategory;
  trustLevel?: TrustLevel;
  minRating?: number;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  skill: RegistryEntry;
  relevanceScore: number;
  matchedOn: ('name' | 'description' | 'tags' | 'category')[];
}

// === Trawler ===

export interface TrawlOptions {
  sources?: ('registry' | 'github' | 'npm')[];
  maxResults?: number;
}

export interface TrawlResult {
  source: 'registry' | 'github' | 'npm' | 'web';
  skill: Partial<RegistryEntry>;
  confidence: number;
  url: string;
}

// === Safeguards ===

export interface SafeguardResult {
  passed: boolean;
  score: number;
  checks: SafeguardCheck[];
}

export interface SafeguardCheck {
  name: string;
  passed: boolean;
  severity: 'info' | 'warning' | 'error';
  message: string;
}
