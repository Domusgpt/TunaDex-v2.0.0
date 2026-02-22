import { readFile } from 'fs/promises';
import { join } from 'path';
import { createHash } from 'crypto';
import { existsSync, readdirSync, statSync } from 'fs';
import { SKILL_FILENAME, MANIFEST_FILENAME } from './constants.js';
import { parseSkillFile, extractManifest } from './parser.js';
import { runSafeguards } from './safeguards.js';
import { SkillValidationError } from './errors.js';
import type { ParsedSkill } from './types.js';

export async function packageSkill(
  skillDir: string,
): Promise<{ skill: ParsedSkill; manifest: Record<string, unknown>; checksum: string }> {
  const skillFile = join(skillDir, SKILL_FILENAME);
  if (!existsSync(skillFile)) {
    throw new SkillValidationError(`No ${SKILL_FILENAME} found in ${skillDir}`);
  }

  const skill = await parseSkillFile(skillFile);
  const safeguards = await runSafeguards(skill, skillDir);

  if (!safeguards.passed) {
    const errors = safeguards.checks
      .filter((c) => !c.passed)
      .map((c) => `[${c.severity}] ${c.message}`);
    throw new SkillValidationError('Skill failed safety checks', errors);
  }

  // Compute checksum of all files
  const checksum = await computeDirectoryChecksum(skillDir);

  const manifest = extractManifest(skill);
  manifest.checksum = `sha256:${checksum}`;
  manifest.files = listFiles(skillDir);
  manifest.size_bytes = computeDirectorySize(skillDir);

  return { skill, manifest, checksum };
}

async function computeDirectoryChecksum(dir: string): Promise<string> {
  const hash = createHash('sha256');
  const files = listFiles(dir).sort();

  for (const file of files) {
    const content = await readFile(join(dir, file));
    hash.update(file);
    hash.update(content);
  }

  return hash.digest('hex');
}

function listFiles(dir: string, prefix = ''): string[] {
  const files: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...listFiles(join(dir, entry.name), relative));
    } else {
      files.push(relative);
    }
  }

  return files;
}

function computeDirectorySize(dir: string): number {
  let size = 0;
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      size += computeDirectorySize(fullPath);
    } else {
      size += statSync(fullPath).size;
    }
  }

  return size;
}
