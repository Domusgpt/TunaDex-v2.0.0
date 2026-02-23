#!/usr/bin/env node

/**
 * Seeds the local skillli index (~/.skillli/index.json) from the
 * bundled registry/index.json so searches work immediately.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const registryPath = join(__dirname, '..', 'registry', 'index.json');
const skillliDir = join(homedir(), '.skillli');
const indexPath = join(skillliDir, 'index.json');

if (!existsSync(skillliDir)) {
  mkdirSync(skillliDir, { recursive: true });
}

const registry = readFileSync(registryPath, 'utf-8');
writeFileSync(indexPath, registry);

const skills = JSON.parse(registry);
const count = Object.keys(skills.skills).length;
console.log(`Seeded ${count} skills into ${indexPath}`);
