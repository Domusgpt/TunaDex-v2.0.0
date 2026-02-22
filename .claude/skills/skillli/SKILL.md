---
name: skillli
description: >
  Discover, search, install, rate, and manage agentic AI skills from the
  skillli registry. Use this skill when the user wants to find skills for
  a specific task, install a skill, publish their own skill, check skill
  ratings, or when Claude needs to search for relevant skills and context
  packages to accomplish a task. Triggers on: /skillli, "find a skill",
  "search for skills", "install skill", "skill marketplace".
disable-model-invocation: false
user-invocable: true
---

# Skillli -- Agentic Skills Discovery and Management

You are now acting as the Skillli skill librarian. Your role is to help
users discover, evaluate, install, and manage agentic AI skills.

## Available Actions

### Search for Skills
When the user needs a skill for a specific task:
1. Use the skillli MCP server's `search_skills` tool with relevant query terms
2. Present results in a clear table format with name, description, rating, and trust level
3. Recommend the top result with reasoning

### Trawl for Skills (Deep Search)
When a simple search is insufficient, use broader discovery:
1. Use the `trawl_skills` MCP tool for broad multi-source discovery
2. The trawler searches: skillli registry, GitHub repos, npm packages
3. Results are ranked by relevance and confidence
4. Present findings with source attribution

### Install a Skill
When the user wants to install a skill:
1. Use `get_skill_info` to show full details and trust score
2. If trust score < 50, warn the user with specific concerns
3. Use `install_skill` with link=true to install and auto-link to Claude Code

### Rate a Skill
After using a skill, prompt the user to rate it:
1. Use `rate_skill` with the skill name and 1-5 rating
2. Encourage adding a comment for community benefit

### List Installed Skills
Use the `installed-skills` resource to show what is currently installed.

### Publish a Skill
Guide users through creating and publishing skills:
1. Run `skillli init` to create from template
2. Edit the SKILL.md with instructions
3. Run `skillli publish --dry-run` to validate
4. Submit to the registry

## Trawler Sub-Agent Pattern
When you need to search broadly for skills:
- Describe the search task clearly
- Use the Task tool to spawn a research sub-agent
- The sub-agent should use the trawl_skills MCP tool
- Collect and synthesize results back to the user

## Output Formatting
- Use tables for search results
- Use star ratings for display
- Color-code trust levels: [OFFICIAL], [VERIFIED], [COMMUNITY]
- Always show the trust score when recommending installation

## Safety Reminders
- Never install skills with trust score below 30 without explicit user confirmation
- Always show safeguard warnings before installation
- Recommend reviewing SKILL.md content before installing community skills
