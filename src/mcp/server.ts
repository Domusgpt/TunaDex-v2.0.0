import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { search } from '../core/search.js';
import { getLocalIndex, getInstalledSkills } from '../core/local-store.js';
import { getSkillEntry } from '../core/registry.js';
import { installFromRegistry, linkToClaudeSkills } from '../core/installer.js';
import { submitRating, formatRating } from '../core/ratings.js';
import { computeTrustScore } from '../core/safeguards.js';
import { parseSkillContent } from '../core/parser.js';
import { trawl } from '../trawler/index.js';
import type { SkillCategory, TrustLevel } from '../core/types.js';

export function createSkillliMcpServer(): McpServer {
  const server = new McpServer({
    name: 'skillli',
    version: '0.1.0',
  });

  // === TOOLS ===

  server.tool(
    'search_skills',
    'Search the skillli registry for agentic AI skills',
    {
      query: z.string().describe('Search query'),
      tags: z.array(z.string()).optional().describe('Filter by tags'),
      category: z.string().optional().describe('Filter by category'),
      limit: z.number().optional().default(10).describe('Max results'),
    },
    async ({ query, tags, category, limit }) => {
      const index = await getLocalIndex();
      const results = search(index, {
        query,
        tags,
        category: category as SkillCategory | undefined,
        limit,
      });

      const text = results.length === 0
        ? 'No skills found matching your query.'
        : results
            .map((r) => {
              const s = r.skill;
              return `**${s.name}** v${s.version} [${s.trustLevel.toUpperCase()}]\n  ${s.description}\n  Rating: ${s.rating.average}/5 (${s.rating.count}) | Downloads: ${s.downloads}\n  Tags: ${s.tags.join(', ')}`;
            })
            .join('\n\n');

      return { content: [{ type: 'text' as const, text }] };
    },
  );

  server.tool(
    'install_skill',
    'Install an agentic skill from the skillli registry',
    {
      name: z.string().describe('Skill name to install'),
      link: z.boolean().optional().default(true).describe('Link to .claude/skills/'),
    },
    async ({ name, link }) => {
      try {
        const installed = await installFromRegistry(name);
        let text = `Installed ${installed.name} v${installed.version} at ${installed.path}`;
        if (link) {
          const linkPath = await linkToClaudeSkills(installed);
          text += `\nLinked to ${linkPath}`;
        }
        return { content: [{ type: 'text' as const, text }] };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: `Install failed: ${error}` }], isError: true };
      }
    },
  );

  server.tool(
    'get_skill_info',
    'Get detailed information about a skill including trust score',
    {
      name: z.string().describe('Skill name'),
    },
    async ({ name }) => {
      try {
        const entry = await getSkillEntry(name);
        const text = [
          `**${entry.name}** v${entry.version} [${entry.trustLevel.toUpperCase()}]`,
          `${entry.description}`,
          `Author: ${entry.author}`,
          `Category: ${entry.category}`,
          `Tags: ${entry.tags.join(', ')}`,
          `Rating: ${entry.rating.average}/5 (${entry.rating.count} ratings)`,
          `Downloads: ${entry.downloads}`,
          entry.repository ? `Repository: ${entry.repository}` : null,
          `Published: ${entry.publishedAt}`,
          `Updated: ${entry.updatedAt}`,
        ]
          .filter(Boolean)
          .join('\n');
        return { content: [{ type: 'text' as const, text }] };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: `Error: ${error}` }], isError: true };
      }
    },
  );

  server.tool(
    'trawl_skills',
    'Agentic search across multiple sources (registry, GitHub, npm) for skills matching a need',
    {
      query: z.string().describe('What kind of skill you need'),
      sources: z
        .array(z.enum(['registry', 'github', 'npm']))
        .optional()
        .default(['registry', 'github']),
      maxResults: z.number().optional().default(5),
    },
    async ({ query, sources, maxResults }) => {
      const results = await trawl(query, { sources, maxResults });
      if (results.length === 0) {
        return { content: [{ type: 'text' as const, text: 'No skills found across any source.' }] };
      }

      const text = results
        .map((r) => {
          const conf = Math.round(r.confidence * 100);
          return `**${r.skill.name ?? 'unknown'}** [${r.source}] (${conf}% match)\n  ${r.skill.description ?? ''}\n  ${r.url}`;
        })
        .join('\n\n');

      return { content: [{ type: 'text' as const, text }] };
    },
  );

  server.tool(
    'rate_skill',
    'Rate an installed skill (1-5 stars)',
    {
      name: z.string().describe('Skill name to rate'),
      rating: z.number().min(1).max(5).describe('Rating 1-5'),
      comment: z.string().optional().describe('Optional review comment'),
    },
    async ({ name, rating, comment }) => {
      try {
        const updated = await submitRating(name, rating, 'mcp-user', comment);
        return {
          content: [
            { type: 'text' as const, text: `Rated ${name}: ${formatRating(updated)}` },
          ],
        };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: `Rating failed: ${error}` }], isError: true };
      }
    },
  );

  // === RESOURCES ===

  server.resource(
    'installed-skills',
    'skillli://installed',
    { description: 'List of all currently installed skillli skills' },
    async () => {
      const skills = await getInstalledSkills();
      return {
        contents: [
          {
            uri: 'skillli://installed',
            mimeType: 'application/json',
            text: JSON.stringify(skills, null, 2),
          },
        ],
      };
    },
  );

  server.resource(
    'skill-index',
    'skillli://index',
    { description: 'The full skillli registry index' },
    async () => {
      const index = await getLocalIndex();
      return {
        contents: [
          {
            uri: 'skillli://index',
            mimeType: 'application/json',
            text: JSON.stringify(index, null, 2),
          },
        ],
      };
    },
  );

  return server;
}
