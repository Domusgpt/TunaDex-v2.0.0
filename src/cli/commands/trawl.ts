import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { trawl } from '../../trawler/index.js';

export function registerTrawlCommand(program: Command): void {
  program
    .command('trawl <query>')
    .description('Agentic search across multiple sources for skills')
    .option(
      '-s, --sources <sources...>',
      'Sources to search (registry, github, npm)',
      ['registry', 'github'],
    )
    .option('-n, --max-results <n>', 'Maximum results', parseInt)
    .action(
      async (
        query: string,
        options: { sources: string[]; maxResults?: number },
      ) => {
        const spinner = ora('Trawling for skills...').start();
        try {
          const results = await trawl(query, {
            sources: options.sources as ('registry' | 'github' | 'npm')[],
            maxResults: options.maxResults,
          });
          spinner.stop();

          if (results.length === 0) {
            console.log(chalk.yellow('No skills found across any source.'));
            return;
          }

          console.log(chalk.bold(`\nTrawled ${results.length} result(s):\n`));
          for (const result of results) {
            const confidence = Math.round(result.confidence * 100);
            const confColor = confidence >= 70 ? chalk.green : confidence >= 40 ? chalk.yellow : chalk.gray;
            console.log(
              `  ${chalk.cyan.bold(result.skill.name ?? 'unknown')} ${chalk.gray(`[${result.source}]`)} ${confColor(`${confidence}% match`)}`,
            );
            if (result.skill.description) {
              console.log(`    ${result.skill.description}`);
            }
            console.log(`    ${chalk.gray(result.url)}`);
            console.log();
          }
        } catch (error) {
          spinner.fail('Trawl failed');
          console.error(chalk.red(String(error)));
          process.exit(1);
        }
      },
    );
}
