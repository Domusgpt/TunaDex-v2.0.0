import chalk from 'chalk';
import type { SearchResult, RegistryEntry, SafeguardResult, InstalledSkill, RatingInfo } from '../../core/types.js';

export function trustBadge(level: string): string {
  switch (level) {
    case 'official':
      return chalk.green.bold('[OFFICIAL]');
    case 'verified':
      return chalk.blue.bold('[VERIFIED]');
    default:
      return chalk.gray('[COMMUNITY]');
  }
}

export function stars(rating: RatingInfo): string {
  const filled = Math.round(rating.average);
  const empty = 5 - filled;
  return chalk.yellow('\u2605'.repeat(filled)) + chalk.gray('\u2606'.repeat(empty));
}

export function displaySearchResults(results: SearchResult[]): void {
  if (results.length === 0) {
    console.log(chalk.yellow('No skills found matching your query.'));
    return;
  }

  console.log(chalk.bold(`\nFound ${results.length} skill(s):\n`));

  for (const { skill, relevanceScore, matchedOn } of results) {
    const badge = trustBadge(skill.trustLevel);
    const rating = stars(skill.rating);
    console.log(
      `  ${chalk.cyan.bold(skill.name)} ${chalk.gray('v' + skill.version)} ${badge}`,
    );
    console.log(`    ${skill.description}`);
    console.log(
      `    ${rating} ${chalk.gray(`| ${skill.downloads} downloads | by ${skill.author}`)}`,
    );
    console.log(
      `    ${chalk.gray('Tags:')} ${skill.tags.map((t) => chalk.magenta(t)).join(', ')}`,
    );
    console.log();
  }
}

export function displaySkillInfo(skill: RegistryEntry): void {
  console.log(chalk.bold.cyan(`\n  ${skill.name}`) + chalk.gray(` v${skill.version}`));
  console.log(`  ${trustBadge(skill.trustLevel)}\n`);
  console.log(`  ${skill.description}\n`);
  console.log(`  ${chalk.bold('Author:')}     ${skill.author}`);
  console.log(`  ${chalk.bold('Category:')}   ${skill.category}`);
  console.log(`  ${chalk.bold('Tags:')}       ${skill.tags.join(', ')}`);
  console.log(`  ${chalk.bold('Rating:')}     ${stars(skill.rating)} (${skill.rating.count} ratings)`);
  console.log(`  ${chalk.bold('Downloads:')}  ${skill.downloads}`);
  if (skill.repository) {
    console.log(`  ${chalk.bold('Repository:')} ${skill.repository}`);
  }
  console.log(`  ${chalk.bold('Published:')}  ${skill.publishedAt}`);
  console.log(`  ${chalk.bold('Updated:')}    ${skill.updatedAt}`);
  console.log();
}

export function displayTrustScore(score: number): void {
  let color: typeof chalk.green;
  if (score >= 70) color = chalk.green;
  else if (score >= 40) color = chalk.yellow;
  else color = chalk.red;

  const bar = '\u2588'.repeat(Math.round(score / 5)) + chalk.gray('\u2591'.repeat(20 - Math.round(score / 5)));
  console.log(`  Trust Score: ${color.bold(score.toString())} / 100  ${bar}`);
}

export function displaySafeguardReport(result: SafeguardResult): void {
  console.log(chalk.bold('\nSafeguard Report:'));
  for (const check of result.checks) {
    const icon = check.passed ? chalk.green('\u2713') : check.severity === 'error' ? chalk.red('\u2717') : chalk.yellow('\u26A0');
    console.log(`  ${icon} ${check.name}: ${check.message}`);
  }
  displayTrustScore(result.score);
  console.log();
}

export function displayInstalledSkills(skills: InstalledSkill[]): void {
  if (skills.length === 0) {
    console.log(chalk.yellow('No skills installed.'));
    return;
  }
  console.log(chalk.bold(`\nInstalled skills (${skills.length}):\n`));
  for (const skill of skills) {
    console.log(
      `  ${chalk.cyan.bold(skill.name)} ${chalk.gray('v' + skill.version)} ${chalk.gray(`(${skill.source})`)}`,
    );
    console.log(`    Installed: ${skill.installedAt}`);
    console.log(`    Path: ${skill.path}`);
    console.log();
  }
}
