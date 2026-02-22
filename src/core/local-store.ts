import { mkdir, readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import {
  SKILLLI_DIR,
  LOCAL_INDEX_PATH,
  CONFIG_PATH,
  SKILLS_DIR,
  CACHE_DIR,
  DEFAULT_REGISTRY_URL,
} from './constants.js';
import type { LocalIndex, LocalConfig, InstalledSkill } from './types.js';

export async function ensureDir(): Promise<void> {
  for (const dir of [SKILLLI_DIR, SKILLS_DIR, CACHE_DIR]) {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }
}

function defaultConfig(): LocalConfig {
  return {
    installedSkills: {},
    registryUrl: DEFAULT_REGISTRY_URL,
    lastSync: '',
  };
}

function defaultIndex(): LocalIndex {
  return {
    version: '1.0.0',
    lastUpdated: '',
    skills: {},
  };
}

export async function getConfig(): Promise<LocalConfig> {
  await ensureDir();
  if (!existsSync(CONFIG_PATH)) {
    const config = defaultConfig();
    await saveConfig(config);
    return config;
  }
  const raw = await readFile(CONFIG_PATH, 'utf-8');
  return JSON.parse(raw) as LocalConfig;
}

export async function saveConfig(config: LocalConfig): Promise<void> {
  await ensureDir();
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export async function getLocalIndex(): Promise<LocalIndex> {
  await ensureDir();
  if (!existsSync(LOCAL_INDEX_PATH)) {
    const index = defaultIndex();
    await saveLocalIndex(index);
    return index;
  }
  const raw = await readFile(LOCAL_INDEX_PATH, 'utf-8');
  return JSON.parse(raw) as LocalIndex;
}

export async function saveLocalIndex(index: LocalIndex): Promise<void> {
  await ensureDir();
  await writeFile(LOCAL_INDEX_PATH, JSON.stringify(index, null, 2));
}

export async function getInstalledSkills(): Promise<InstalledSkill[]> {
  const config = await getConfig();
  return Object.values(config.installedSkills);
}

export async function markInstalled(skill: InstalledSkill): Promise<void> {
  const config = await getConfig();
  config.installedSkills[skill.name] = skill;
  await saveConfig(config);
}

export async function markUninstalled(name: string): Promise<void> {
  const config = await getConfig();
  delete config.installedSkills[name];
  await saveConfig(config);
}
