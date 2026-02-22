import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { uninstall } from '../../core/installer.js';

export function registerUninstallCommand(program: Command): void {
  program
    .command('uninstall <skill>')
    .description('Uninstall a skill')
    .action(async (skill: string) => {
      const spinner = ora(`Uninstalling ${skill}...`).start();
      try {
        await uninstall(skill);
        spinner.succeed(`Uninstalled ${chalk.cyan(skill)}`);
      } catch (error) {
        spinner.fail('Uninstall failed');
        console.error(chalk.red(String(error)));
        process.exit(1);
      }
    });
}
