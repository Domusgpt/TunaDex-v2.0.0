#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createSkillliMcpServer } from './server.js';

async function main() {
  const server = createSkillliMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('skillli MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal MCP server error:', error);
  process.exit(1);
});
