// Core types
export type {
  SkillMetadata,
  ParsedSkill,
  RegistryEntry,
  SearchOptions,
  SearchResult,
  RatingInfo,
  SafeguardResult,
  TrawlResult,
  InstalledSkill,
  LocalConfig,
  LocalIndex,
  SkillCategory,
  TrustLevel,
  SafeguardCheck,
  TrawlOptions,
} from './core/types.js';

// Parser
export { parseSkillFile, parseSkillContent, validateMetadata, extractManifest } from './core/parser.js';

// Search
export { search, searchByTags, searchByCategory } from './core/search.js';

// Installer
export {
  installFromRegistry,
  installFromGithub,
  installFromLocal,
  uninstall,
  linkToClaudeSkills,
} from './core/installer.js';

// Safeguards
export { runSafeguards, computeTrustScore } from './core/safeguards.js';

// Registry
export { fetchIndex, getSkillEntry, syncIndex } from './core/registry.js';

// Ratings
export { submitRating, getRatings, formatRating } from './core/ratings.js';

// Publisher
export { packageSkill } from './core/publisher.js';

// Local store
export { getConfig, getInstalledSkills, getLocalIndex } from './core/local-store.js';

// Trawler
export { trawl } from './trawler/index.js';

// MCP server
export { createSkillliMcpServer } from './mcp/server.js';

// Schema (for consumers who want to validate)
export { SkillMetadataSchema } from './core/schema.js';

// Constants
export { VERSION } from './core/constants.js';
