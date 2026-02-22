import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { installFromRegistry, installFromGithub, installFromLocal, linkToClaudeSkills } from '../../core/installer.js';
import { displayTrustScore } from '../utils/display.js';

export function registerInstallCommand(program: Command): void {
  program
    .command('install <skill>')
    .description('Install a skill from the registry, GitHub URL, or local path')
    .option('--link', 'Symlink to .claude/skills/ for Claude Code', false)
    .option('--local', 'Install from a local directory')
    .action(
      async (
        skill: string,
        options: { link: boolean; local: boolean },
      ) => {
        const spinner = ora(`Installing ${skill}...`).start();
        try {
          let installed;
          if (options.local) {
            installed = await installFromLocal(skill);
          } else if (skill.startsWith('http') || skill.includes('github.com')) {
            installed = await installFromGithub(skill);
          } else {
            installed = await installFromRegistry(skill);
          }
          spinner.succeed(`Installed ${chalk.cyan(installed.name)} v${installed.version}`);
          console.log(`  Path: ${installed.path}`);

          if (options.link) {
            const linkPath = await linkToClaudeSkills(installed);
            console.log(`  Linked to: ${linkPath}`);
          }
        } catch (error) {
          spinner.fail('Installation failed');
          console.error(chalk.red(String(error)));
          process.exit(1);
        }
      },
    );
}
