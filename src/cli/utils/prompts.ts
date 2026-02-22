import inquirer from 'inquirer';
import type { SkillCategory } from '../../core/types.js';

export interface InitAnswers {
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  tags: string;
  category: SkillCategory;
}

export async function promptInit(defaults?: Partial<InitAnswers>): Promise<InitAnswers> {
  return inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Skill name (lowercase, hyphens):',
      default: defaults?.name,
      validate: (v: string) => /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(v) || 'Must be lowercase alphanumeric with hyphens',
    },
    {
      type: 'input',
      name: 'version',
      message: 'Version:',
      default: defaults?.version ?? '1.0.0',
    },
    {
      type: 'input',
      name: 'description',
      message: 'Description (10-500 chars):',
      default: defaults?.description,
      validate: (v: string) => (v.length >= 10 && v.length <= 500) || 'Must be 10-500 characters',
    },
    {
      type: 'input',
      name: 'author',
      message: 'Author (GitHub username):',
      default: defaults?.author,
    },
    {
      type: 'input',
      name: 'license',
      message: 'License:',
      default: defaults?.license ?? 'MIT',
    },
    {
      type: 'input',
      name: 'tags',
      message: 'Tags (comma-separated):',
      default: defaults?.tags,
    },
    {
      type: 'list',
      name: 'category',
      message: 'Category:',
      choices: ['development', 'creative', 'enterprise', 'data', 'devops', 'other'],
      default: defaults?.category ?? 'other',
    },
  ]) as Promise<InitAnswers>;
}
