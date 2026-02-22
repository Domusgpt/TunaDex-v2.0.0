# Skillli Skill Format Specification

## SKILL.md Structure

Every skill package MUST contain a `SKILL.md` file with YAML frontmatter.

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Lowercase alphanumeric with hyphens (e.g. `my-skill`) |
| `version` | string | Semver format (e.g. `1.0.0`) |
| `description` | string | 10-500 characters describing the skill |
| `author` | string | GitHub username or org |
| `license` | string | SPDX license identifier (e.g. `MIT`) |
| `tags` | string[] | 1-20 tags for discovery |
| `category` | enum | One of: `development`, `creative`, `enterprise`, `data`, `devops`, `other` |

### Optional Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `repository` | string | - | GitHub repo URL |
| `homepage` | string | - | Homepage URL |
| `min-skillli-version` | string | - | Minimum skillli version required |
| `trust-level` | enum | `community` | `community`, `verified`, or `official` |
| `checksum` | string | - | SHA-256 checksum (auto-generated on publish) |
| `disable-model-invocation` | boolean | `false` | Prevent AI from auto-invoking |
| `user-invocable` | boolean | `true` | Allow manual invocation via slash command |

### Trust Levels

- **community**: Published by any user; basic validation only
- **verified**: Author identity verified; additional review
- **official**: Maintained by the skillli team

### Markdown Body

The body after the frontmatter contains the skill instructions that Claude
follows when the skill is invoked. Keep under 500 lines.

## Skill Package Directory

```
my-skill/
├── SKILL.md         # Required
├── skillli.json     # Auto-generated manifest
├── scripts/         # Optional helper scripts (.sh, .py, .js only)
├── references/      # Optional reference documents
├── assets/          # Optional templates, configs
├── agents.md        # Optional agent instructions (CLAUDE.md equivalent)
└── LICENSE          # Recommended
```

## Categories

- **development**: Code, testing, CI/CD, debugging
- **creative**: Writing, design, content creation
- **enterprise**: Business, compliance, reporting
- **data**: Analytics, ETL, visualization
- **devops**: Infrastructure, deployment, monitoring
- **other**: Everything else
