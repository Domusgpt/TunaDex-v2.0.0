import { readFile, stat } from 'fs/promises';
import { join } from 'path';
import { existsSync, readdirSync } from 'fs';
import { MAX_SKILL_SIZE_BYTES, MAX_SKILL_MD_LINES } from './constants.js';
import type { ParsedSkill, SafeguardResult, SafeguardCheck, RegistryEntry } from './types.js';

const PROHIBITED_PATTERNS = [
  { pattern: /\beval\s*\(/, label: 'eval()' },
  { pattern: /\bexec\s*\(/, label: 'exec()' },
  { pattern: /\bexecSync\s*\(/, label: 'execSync()' },
  { pattern: /rm\s+-rf\s+\//, label: 'rm -rf /' },
  { pattern: /\bchild_process\b/, label: 'child_process' },
  { pattern: /\bProcess\.kill\b/i, label: 'Process.kill' },
  { pattern: /password\s*[:=]\s*['"][^'"]+['"]/, label: 'hardcoded password' },
  { pattern: /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/, label: 'hardcoded API key' },
  { pattern: /[A-Za-z0-9+/]{100,}={0,2}/, label: 'large base64 blob' },
];

const ALLOWED_SCRIPT_EXTENSIONS = ['.sh', '.py', '.js', '.ts'];

export function checkSchema(skill: ParsedSkill): SafeguardCheck {
  // If we got a ParsedSkill, it already passed schema validation
  return {
    name: 'schema-validation',
    passed: true,
    severity: 'info',
    message: 'SKILL.md metadata is valid',
  };
}

export function checkLineCount(content: string): SafeguardCheck {
  const lines = content.split('\n').length;
  const passed = lines <= MAX_SKILL_MD_LINES;
  return {
    name: 'line-count',
    passed,
    severity: passed ? 'info' : 'warning',
    message: passed
      ? `SKILL.md has ${lines} lines (max ${MAX_SKILL_MD_LINES})`
      : `SKILL.md has ${lines} lines, exceeds max of ${MAX_SKILL_MD_LINES}`,
  };
}

export function checkProhibitedPatterns(content: string): SafeguardCheck {
  const found: string[] = [];
  for (const { pattern, label } of PROHIBITED_PATTERNS) {
    if (pattern.test(content)) {
      found.push(label);
    }
  }
  const passed = found.length === 0;
  return {
    name: 'prohibited-patterns',
    passed,
    severity: passed ? 'info' : 'error',
    message: passed
      ? 'No prohibited patterns detected'
      : `Prohibited patterns found: ${found.join(', ')}`,
  };
}

export function checkScriptSafety(skillDir: string): SafeguardCheck {
  const scriptsDir = join(skillDir, 'scripts');
  if (!existsSync(scriptsDir)) {
    return {
      name: 'script-safety',
      passed: true,
      severity: 'info',
      message: 'No scripts directory found',
    };
  }

  const badFiles: string[] = [];
  const files = readdirSync(scriptsDir, { recursive: true }) as string[];
  for (const file of files) {
    const ext = '.' + file.split('.').pop();
    if (!ALLOWED_SCRIPT_EXTENSIONS.includes(ext)) {
      badFiles.push(file);
    }
  }

  const passed = badFiles.length === 0;
  return {
    name: 'script-safety',
    passed,
    severity: passed ? 'info' : 'error',
    message: passed
      ? 'All scripts use allowed extensions'
      : `Disallowed script types: ${badFiles.join(', ')}`,
  };
}

export async function checkFileSize(skillDir: string): Promise<SafeguardCheck> {
  let totalSize = 0;
  const entries = readdirSync(skillDir, { recursive: true, withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile()) {
      const fullPath = join(entry.parentPath ?? skillDir, entry.name);
      const s = await stat(fullPath);
      totalSize += s.size;
    }
  }
  const passed = totalSize <= MAX_SKILL_SIZE_BYTES;
  return {
    name: 'file-size',
    passed,
    severity: passed ? 'info' : 'warning',
    message: passed
      ? `Total size: ${(totalSize / 1024).toFixed(1)}KB (max ${MAX_SKILL_SIZE_BYTES / 1024 / 1024}MB)`
      : `Total size ${(totalSize / 1024 / 1024).toFixed(1)}MB exceeds max of ${MAX_SKILL_SIZE_BYTES / 1024 / 1024}MB`,
  };
}

export async function runSafeguards(
  skill: ParsedSkill,
  skillDir?: string,
): Promise<SafeguardResult> {
  const checks: SafeguardCheck[] = [];

  checks.push(checkSchema(skill));
  checks.push(checkLineCount(skill.content));
  checks.push(checkProhibitedPatterns(skill.content + skill.rawFrontmatter));

  if (skillDir) {
    checks.push(checkScriptSafety(skillDir));
    checks.push(await checkFileSize(skillDir));
  }

  const passed = checks.every((c) => c.passed || c.severity !== 'error');
  const score = computeTrustScore(skill);

  return { passed, score, checks };
}

export function computeTrustScore(
  skill: ParsedSkill,
  registryEntry?: RegistryEntry,
): number {
  let score = 0;

  // Has repository (+10)
  if (skill.metadata.repository) score += 10;

  // Has license (+10)
  if (skill.metadata.license) score += 10;

  // Verified/official author (+20)
  if (skill.metadata.trustLevel === 'verified') score += 15;
  if (skill.metadata.trustLevel === 'official') score += 20;

  // Rating above 3.5 (+15)
  if (registryEntry && registryEntry.rating.average >= 3.5) score += 15;

  // Downloads bonus (+10)
  if (registryEntry && registryEntry.downloads > 100) score += 5;
  if (registryEntry && registryEntry.downloads > 1000) score += 5;

  // Passes basic checks (+35)
  const patternCheck = checkProhibitedPatterns(skill.content);
  const lineCheck = checkLineCount(skill.content);
  if (patternCheck.passed) score += 20;
  if (lineCheck.passed) score += 15;

  return Math.min(score, 100);
}
