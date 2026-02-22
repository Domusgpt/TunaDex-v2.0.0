import { Command } from 'commander';
import chalk from 'chalk';
import { submitRating, formatRating } from '../../core/ratings.js';
import { getConfig } from '../../core/local-store.js';

export function registerRateCommand(program: Command): void {
  program
    .command('rate <skill> <rating>')
    .description('Rate a skill (1-5 stars)')
    .option('-m, --comment <text>', 'Add a review comment')
    .action(async (skill: string, ratingStr: string, options: { comment?: string }) => {
      try {
        const rating = parseInt(ratingStr, 10);
        if (isNaN(rating) || rating < 1 || rating > 5) {
          console.error(chalk.red('Rating must be 1-5'));
          process.exit(1);
        }

        const config = await getConfig();
        const userId = config.userId ?? 'anonymous';
        const updated = await submitRating(skill, rating, userId, options.comment);
        console.log(chalk.green(`\nRated ${chalk.cyan(skill)}: ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`));
        console.log(`  Updated: ${formatRating(updated)}`);
      } catch (error) {
        console.error(chalk.red(String(error)));
        process.exit(1);
      }
    });
}
