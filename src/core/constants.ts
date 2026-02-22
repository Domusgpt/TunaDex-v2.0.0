import { homedir } from 'os';
import { join } from 'path';

export const SKILLLI_DIR = join(homedir(), '.skillli');
export const LOCAL_INDEX_PATH = join(SKILLLI_DIR, 'index.json');
export const CONFIG_PATH = join(SKILLLI_DIR, 'config.json');
export const SKILLS_DIR = join(SKILLLI_DIR, 'skills');
export const CACHE_DIR = join(SKILLLI_DIR, 'cache');

export const DEFAULT_REGISTRY_URL =
  'https://raw.githubusercontent.com/skillli/registry/main/index.json';
export const DEFAULT_RATINGS_URL =
  'https://raw.githubusercontent.com/skillli/registry/main/ratings/';

export const SKILL_FILENAME = 'SKILL.md';
export const MANIFEST_FILENAME = 'skillli.json';
export const MAX_SKILL_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_SKILL_MD_LINES = 500;

export const VERSION = '0.1.0';
