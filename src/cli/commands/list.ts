import { Command } from 'commander';
import chalk from 'chalk';
import { getInstalledSkills } from '../../core/local-store.js';
import { displayInstalledSkills } from '../utils/display.js';

export function registerListCommand(program: Command): void {
  program
    .command('list')
    .description('List installed skills')
    .option('--json', 'Output as JSON')
    .action(async (options: { json: boolean }) => {
      try {
        const skills = await getInstalledSkills();
        if (options.json) {
          console.log(JSON.stringify(skills, null, 2));
        } else {
          displayInstalledSkills(skills);
        }
      } catch (error) {
        console.error(chalk.red(String(error)));
        process.exit(1);
      }
    });
}
