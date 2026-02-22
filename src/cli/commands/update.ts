import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { syncIndex } from '../../core/registry.js';

export function registerUpdateCommand(program: Command): void {
  program
    .command('update')
    .description('Update the local skill index from the registry')
    .action(async () => {
      const spinner = ora('Syncing registry index...').start();
      try {
        const index = await syncIndex();
        const count = Object.keys(index.skills).length;
        spinner.succeed(`Index updated: ${count} skills available`);
      } catch (error) {
        spinner.fail('Failed to update index');
        console.error(chalk.red(String(error)));
        process.exit(1);
      }
    });
}
