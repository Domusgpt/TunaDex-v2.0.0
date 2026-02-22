import { Command } from 'commander';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import chalk from 'chalk';
import { promptInit } from '../utils/prompts.js';

const SKILL_TEMPLATE = (answers: {
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  tags: string[];
  category: string;
}) => `---
name: ${answers.name}
version: ${answers.version}
description: ${answers.description}
author: ${answers.author}
license: ${answers.license}
tags: [${answers.tags.join(', ')}]
category: ${answers.category}
trust-level: community
user-invocable: true
---

# ${answers.name}

${answers.description}

## When to Use

Describe when this skill should be invoked.

## Instructions

Describe what the AI should do when this skill is activated.

## Examples

Provide example inputs and expected behavior.
`;

export function registerInitCommand(program: Command): void {
  program
    .command('init [name]')
    .description('Create a new skill from template')
    .option('-d, --dir <path>', 'Output directory', '.')
    .action(async (name: string | undefined, options: { dir: string }) => {
      try {
        const answers = await promptInit({ name });
        const tags = answers.tags.split(',').map((t) => t.trim()).filter(Boolean);
        const outputDir = join(options.dir, answers.name);

        if (existsSync(outputDir)) {
          console.log(chalk.red(`Directory ${outputDir} already exists.`));
          process.exit(1);
        }

        await mkdir(outputDir, { recursive: true });
        await mkdir(join(outputDir, 'scripts'), { recursive: true });
        await mkdir(join(outputDir, 'references'), { recursive: true });

        const content = SKILL_TEMPLATE({ ...answers, tags });
        await writeFile(join(outputDir, 'SKILL.md'), content);

        const manifest = {
          name: answers.name,
          version: answers.version,
          description: answers.description,
          author: answers.author,
          license: answers.license,
          tags,
          category: answers.category,
        };
        await writeFile(join(outputDir, 'skillli.json'), JSON.stringify(manifest, null, 2));

        console.log(chalk.green(`\nSkill "${answers.name}" created at ${outputDir}`));
        console.log(chalk.gray('  Edit SKILL.md to add your skill instructions.'));
        console.log(chalk.gray('  Run `skillli publish` when ready to share.\n'));
      } catch (error) {
        console.error(chalk.red('Error:'), error);
        process.exit(1);
      }
    });
}
