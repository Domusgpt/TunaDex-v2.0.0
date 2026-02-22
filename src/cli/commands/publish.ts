import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { packageSkill } from '../../core/publisher.js';
import { displaySafeguardReport } from '../utils/display.js';
import { runSafeguards } from '../../core/safeguards.js';
import { parseSkillFile } from '../../core/parser.js';
import { join } from 'path';
import { SKILL_FILENAME } from '../../core/constants.js';

export function registerPublishCommand(program: Command): void {
  program
    .command('publish [path]')
    .description('Publish a skill to the registry')
    .option('--dry-run', 'Validate without publishing')
    .action(async (path: string | undefined, options: { dryRun: boolean }) => {
      const skillDir = path ?? process.cwd();
      const spinner = ora('Packaging skill...').start();

      try {
        const { skill, manifest, checksum } = await packageSkill(skillDir);
        spinner.succeed(`Packaged ${chalk.cyan(skill.metadata.name)} v${skill.metadata.version}`);

        // Show safeguard report
        const safeguards = await runSafeguards(skill, skillDir);
        displaySafeguardReport(safeguards);

        console.log(chalk.bold('Manifest:'));
        console.log(JSON.stringify(manifest, null, 2));

        if (options.dryRun) {
          console.log(chalk.yellow('\n  --dry-run: Skill was NOT published.'));
          console.log(chalk.gray('  Remove --dry-run to publish for real.\n'));
          return;
        }

        // In v1, publishing instructions (PR-based on GitHub)
        console.log(chalk.green('\n  Skill validated and ready to publish!'));
        console.log(chalk.gray('  To publish, submit a PR to the skillli registry:'));
        console.log(chalk.gray('  https://github.com/skillli/registry\n'));
        console.log(chalk.gray(`  Checksum: sha256:${checksum}`));
      } catch (error) {
        spinner.fail('Publish failed');
        console.error(chalk.red(String(error)));
        process.exit(1);
      }
    });
}
