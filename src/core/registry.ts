import { DEFAULT_REGISTRY_URL } from './constants.js';
import { RegistryError, SkillNotFoundError } from './errors.js';
import { getConfig, saveLocalIndex, getLocalIndex } from './local-store.js';
import type { LocalIndex, RegistryEntry } from './types.js';

export async function fetchIndex(registryUrl?: string): Promise<LocalIndex> {
  const config = await getConfig();
  const url = registryUrl ?? config.registryUrl ?? DEFAULT_REGISTRY_URL;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new RegistryError(`Failed to fetch registry: ${res.status} ${res.statusText}`);
    }
    const index = (await res.json()) as LocalIndex;
    index.lastUpdated = new Date().toISOString();
    await saveLocalIndex(index);
    return index;
  } catch (error) {
    if (error instanceof RegistryError) throw error;
    // Fallback to local index if network fails
    const localIndex = await getLocalIndex();
    if (Object.keys(localIndex.skills).length > 0) {
      return localIndex;
    }
    throw new RegistryError(`Cannot reach registry at ${url}: ${error}`);
  }
}

export async function getSkillEntry(name: string): Promise<RegistryEntry> {
  const index = await getLocalIndex();
  const entry = index.skills[name];
  if (!entry) {
    throw new SkillNotFoundError(name);
  }
  return entry;
}

export async function syncIndex(): Promise<LocalIndex> {
  return fetchIndex();
}
