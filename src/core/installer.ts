import { mkdir, rm, symlink, readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { SKILLS_DIR, SKILL_FILENAME } from './constants.js';
import { InstallError } from './errors.js';
import { getSkillEntry } from './registry.js';
import { parseSkillFile } from './parser.js';
import { runSafeguards } from './safeguards.js';
import { markInstalled, markUninstalled } from './local-store.js';
import type { InstalledSkill } from './types.js';

export async function installFromRegistry(
  name: string,
  version?: string,
): Promise<InstalledSkill> {
  const entry = await getSkillEntry(name);
  if (!entry.repository) {
    throw new InstallError(`Skill "${name}" has no repository URL`);
  }
  return installFromGithub(entry.repository, name);
}

export async function installFromGithub(
  repoUrl: string,
  nameOverride?: string,
): Promise<InstalledSkill> {
  const name = nameOverride ?? repoUrl.split('/').pop()?.replace(/\.git$/, '') ?? 'unknown';
  const installPath = join(SKILLS_DIR, name);

  if (existsSync(installPath)) {
    await rm(installPath, { recursive: true });
  }
  await mkdir(installPath, { recursive: true });

  try {
    execSync(`git clone --depth 1 "${repoUrl}" "${installPath}"`, {
      stdio: 'pipe',
      timeout: 30000,
    });
  } catch {
    throw new InstallError(`Failed to clone ${repoUrl}`);
  }

  // Validate installed skill
  const skillFile = join(installPath, SKILL_FILENAME);
  if (!existsSync(skillFile)) {
    await rm(installPath, { recursive: true });
    throw new InstallError(`No ${SKILL_FILENAME} found in ${repoUrl}`);
  }

  const skill = await parseSkillFile(skillFile);
  const safeguards = await runSafeguards(skill, installPath);
  if (!safeguards.passed) {
    await rm(installPath, { recursive: true });
    const errors = safeguards.checks
      .filter((c) => !c.passed)
      .map((c) => c.message);
    throw new InstallError(`Skill failed safety checks: ${errors.join('; ')}`);
  }

  const installed: InstalledSkill = {
    name: skill.metadata.name,
    version: skill.metadata.version,
    installedAt: new Date().toISOString(),
    path: installPath,
    source: 'github',
  };
  await markInstalled(installed);
  return installed;
}

export async function installFromLocal(dirPath: string): Promise<InstalledSkill> {
  const skillFile = join(dirPath, SKILL_FILENAME);
  if (!existsSync(skillFile)) {
    throw new InstallError(`No ${SKILL_FILENAME} found in ${dirPath}`);
  }

  const skill = await parseSkillFile(skillFile);
  const safeguards = await runSafeguards(skill, dirPath);
  if (!safeguards.passed) {
    const errors = safeguards.checks
      .filter((c) => !c.passed)
      .map((c) => c.message);
    throw new InstallError(`Skill failed safety checks: ${errors.join('; ')}`);
  }

  const installPath = join(SKILLS_DIR, skill.metadata.name);
  if (existsSync(installPath)) {
    await rm(installPath, { recursive: true });
  }

  // Copy the directory
  execSync(`cp -r "${dirPath}" "${installPath}"`, { stdio: 'pipe' });

  const installed: InstalledSkill = {
    name: skill.metadata.name,
    version: skill.metadata.version,
    installedAt: new Date().toISOString(),
    path: installPath,
    source: 'local',
  };
  await markInstalled(installed);
  return installed;
}

export async function uninstall(name: string): Promise<void> {
  const installPath = join(SKILLS_DIR, name);
  if (existsSync(installPath)) {
    await rm(installPath, { recursive: true });
  }
  await markUninstalled(name);
}

export async function linkToClaudeSkills(
  skill: InstalledSkill,
  projectDir = process.cwd(),
): Promise<string> {
  const claudeSkillsDir = join(projectDir, '.claude', 'skills');
  await mkdir(claudeSkillsDir, { recursive: true });

  const linkPath = join(claudeSkillsDir, skill.name);
  if (existsSync(linkPath)) {
    await rm(linkPath, { recursive: true });
  }
  await symlink(skill.path, linkPath, 'dir');
  return linkPath;
}
