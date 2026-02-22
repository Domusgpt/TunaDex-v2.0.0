import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { getSkillEntry } from '../../core/registry.js';
import { displaySkillInfo, displayTrustScore } from '../utils/display.js';

export function registerInfoCommand(program: Command): void {
  program
    .command('info <skill>')
    .description('Display detailed information about a skill')
    .action(async (skill: string) => {
      const spinner = ora('Fetching skill info...').start();
      try {
        const entry = await getSkillEntry(skill);
        spinner.stop();
        displaySkillInfo(entry);
      } catch (error) {
        spinner.fail('Failed to get skill info');
        console.error(chalk.red(String(error)));
        process.exit(1);
      }
    });
}
