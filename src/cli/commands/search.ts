import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { search } from '../../core/search.js';
import { getLocalIndex } from '../../core/local-store.js';
import { displaySearchResults } from '../utils/display.js';
import type { SkillCategory, TrustLevel } from '../../core/types.js';

export function registerSearchCommand(program: Command): void {
  program
    .command('search <query>')
    .description('Search for skills in the registry')
    .option('-t, --tag <tags...>', 'Filter by tags')
    .option('-c, --category <category>', 'Filter by category')
    .option('--trust <level>', 'Filter by trust level')
    .option('--min-rating <n>', 'Minimum rating', parseFloat)
    .option('-l, --limit <n>', 'Max results', parseInt)
    .action(
      async (
        query: string,
        options: {
          tag?: string[];
          category?: string;
          trust?: string;
          minRating?: number;
          limit?: number;
        },
      ) => {
        const spinner = ora('Searching skills...').start();
        try {
          const index = await getLocalIndex();
          const results = search(index, {
            query,
            tags: options.tag,
            category: options.category as SkillCategory | undefined,
            trustLevel: options.trust as TrustLevel | undefined,
            minRating: options.minRating,
            limit: options.limit,
          });
          spinner.stop();
          displaySearchResults(results);
        } catch (error) {
          spinner.fail('Search failed');
          console.error(chalk.red(String(error)));
          process.exit(1);
        }
      },
    );
}
