import type {
  Project,
  Branch,
  PullRequest,
  Commit,
  ActionsRun,
  ProjectTags,
} from "../firestore/types.js";

function sha(prefix: string): string {
  const hex = "0123456789abcdef";
  let result = prefix;
  while (result.length < 40) {
    result += hex[Math.floor(Math.random() * 16)];
  }
  return result.slice(0, 40);
}

function makeBranches(defaultName: string, extras: string[]): Branch[] {
  const branches: Branch[] = [
    {
      name: defaultName,
      isDefault: true,
      lastCommitSha: sha("a1b2c3"),
      lastCommitDate: "2026-02-18T10:30:00Z",
    },
  ];
  for (const name of extras) {
    branches.push({
      name,
      isDefault: false,
      lastCommitSha: sha("d4e5f6"),
      lastCommitDate: "2026-02-15T08:00:00Z",
    });
  }
  return branches;
}

function makeCommits(
  authors: string[],
  messages: string[],
  baseDate: string
): Commit[] {
  const base = new Date(baseDate).getTime();
  return messages.map((message, i) => ({
    sha: sha(`cc${i}`),
    message,
    author: authors[i % authors.length],
    date: new Date(base - i * 86400000).toISOString(),
    url: `https://github.com/Domusgpt/repo/commit/${sha(`cc${i}`)}`,
  }));
}

function makePR(
  num: number,
  title: string,
  author: string,
  labels: string[],
  createdAt: string
): PullRequest {
  return {
    number: num,
    title,
    state: "open",
    author,
    createdAt,
    updatedAt: "2026-02-19T12:00:00Z",
    url: `https://github.com/Domusgpt/repo/pull/${num}`,
    labels,
  };
}

function makeActionsRun(
  name: string,
  status: string,
  conclusion: string | null,
  createdAt: string
): ActionsRun {
  return {
    id: Math.floor(Math.random() * 900000000) + 100000000,
    name,
    status,
    conclusion,
    url: "https://github.com/Domusgpt/repo/actions/runs/1",
    createdAt,
  };
}

const now = "2026-02-20T12:00:00Z";

export function getMockProjects(): Project[] {
  return [
    // 1. geometric-lab
    {
      id: "geometric-lab",
      fullName: "Domusgpt/geometric-lab",
      description:
        "Interactive Three.js / WebGL creative coding experiments with procedural geometry and shader art",
      url: "https://github.com/Domusgpt/geometric-lab",
      homepage: "https://geometric-lab.vercel.app",
      language: "TypeScript",
      languages: { TypeScript: 48200, GLSL: 12400, HTML: 3100, CSS: 1800 },
      topics: ["threejs", "webgl", "creative-coding", "shaders", "generative-art"],
      visibility: "public",
      defaultBranch: "main",
      createdAt: "2025-08-12T09:00:00Z",
      updatedAt: "2026-02-19T14:22:00Z",
      pushedAt: "2026-02-19T14:22:00Z",
      stars: 42,
      forks: 8,
      openIssues: 5,
      branches: makeBranches("main", [
        "feat/particle-system",
        "fix/shader-compat",
        "experiment/raymarching",
      ]),
      openPRs: [
        makePR(
          23,
          "Add GPU particle system with compute shaders",
          "domusgpt",
          ["enhancement", "rendering"],
          "2026-02-14T10:00:00Z"
        ),
        makePR(
          21,
          "Fix WebGL2 fallback for Safari",
          "contrib-sarah",
          ["bug", "browser-compat"],
          "2026-02-10T08:00:00Z"
        ),
      ],
      recentCommits: makeCommits(
        ["domusgpt", "contrib-sarah", "domusgpt"],
        [
          "refactor: extract geometry utils into separate module",
          "feat: add wireframe toggle to all demos",
          "fix: correct normal calculation in icosphere generator",
          "docs: update README with new demo screenshots",
          "perf: batch draw calls for instanced meshes",
        ],
        "2026-02-19T14:22:00Z"
      ),
      actionsStatus: makeActionsRun("CI", "completed", "success", "2026-02-19T14:30:00Z"),
      tags: {
        category: "creative",
        status: "active",
        priority: "high",
        group: "frontend",
        custom: ["webgl", "3d"],
      },
      lastDiscoveredAt: now,
      lastEnrichedAt: now,
    },

    // 2. vib34d-engine
    {
      id: "vib34d-engine",
      fullName: "Domusgpt/vib34d-engine",
      description:
        "Vibration-based 3D engine prototype — spatial audio and haptic feedback for immersive web experiences",
      url: "https://github.com/Domusgpt/vib34d-engine",
      homepage: null,
      language: "Rust",
      languages: { Rust: 62000, TypeScript: 18000, WASM: 5400 },
      topics: ["3d-engine", "wasm", "rust", "spatial-audio", "haptics"],
      visibility: "public",
      defaultBranch: "main",
      createdAt: "2025-10-01T12:00:00Z",
      updatedAt: "2026-02-17T20:15:00Z",
      pushedAt: "2026-02-17T20:15:00Z",
      stars: 127,
      forks: 19,
      openIssues: 12,
      branches: makeBranches("main", [
        "feat/wasm-bindings",
        "dev/audio-pipeline",
        "refactor/ecs-core",
      ]),
      openPRs: [
        makePR(
          45,
          "Implement ECS-based scene graph",
          "domusgpt",
          ["architecture", "core"],
          "2026-02-12T11:00:00Z"
        ),
        makePR(
          43,
          "Add WebXR haptic feedback integration",
          "xr-dev-mike",
          ["feature", "webxr"],
          "2026-02-08T15:00:00Z"
        ),
        makePR(
          41,
          "Optimize WASM memory allocation",
          "domusgpt",
          ["performance"],
          "2026-02-05T09:00:00Z"
        ),
      ],
      recentCommits: makeCommits(
        ["domusgpt", "xr-dev-mike", "domusgpt", "rust-contributor"],
        [
          "feat: add spatial audio panning with HRTF",
          "fix: memory leak in WASM texture loader",
          "refactor: move render pipeline to trait-based design",
          "test: add benchmarks for ECS iteration",
          "chore: update wasm-bindgen to 0.2.95",
          "feat: basic haptic feedback for collision events",
        ],
        "2026-02-17T20:15:00Z"
      ),
      actionsStatus: makeActionsRun("Build & Test", "completed", "success", "2026-02-17T20:30:00Z"),
      tags: {
        category: "engine",
        status: "beta",
        priority: "high",
        group: "core",
        custom: ["wasm", "rust", "3d"],
      },
      lastDiscoveredAt: now,
      lastEnrichedAt: now,
    },

    // 3. flutter-dashboard
    {
      id: "flutter-dashboard",
      fullName: "Domusgpt/flutter-dashboard",
      description:
        "Cross-platform Flutter dashboard for monitoring project metrics and CI/CD status",
      url: "https://github.com/Domusgpt/flutter-dashboard",
      homepage: null,
      language: "Dart",
      languages: { Dart: 54000, Swift: 2200, Kotlin: 1800 },
      topics: ["flutter", "dart", "dashboard", "mobile", "cross-platform"],
      visibility: "public",
      defaultBranch: "develop",
      createdAt: "2025-11-20T16:00:00Z",
      updatedAt: "2026-02-14T11:00:00Z",
      pushedAt: "2026-02-14T11:00:00Z",
      stars: 15,
      forks: 3,
      openIssues: 8,
      branches: makeBranches("develop", [
        "main",
        "feat/chart-widgets",
        "fix/dark-mode",
      ]),
      openPRs: [
        makePR(
          12,
          "Add real-time chart widgets for commit activity",
          "domusgpt",
          ["feature", "ui"],
          "2026-02-11T10:00:00Z"
        ),
      ],
      recentCommits: makeCommits(
        ["domusgpt", "flutter-fan"],
        [
          "feat: scaffold project list screen with riverpod",
          "style: apply material 3 theming",
          "fix: bottom nav not highlighting active tab",
          "chore: upgrade Flutter to 3.28",
        ],
        "2026-02-14T11:00:00Z"
      ),
      actionsStatus: makeActionsRun("Flutter CI", "completed", "failure", "2026-02-14T11:30:00Z"),
      tags: {
        category: "app",
        status: "prototype",
        priority: "medium",
        group: "frontend",
        custom: ["mobile", "flutter"],
      },
      lastDiscoveredAt: now,
      lastEnrichedAt: now,
    },

    // 4. agent-swarm
    {
      id: "agent-swarm",
      fullName: "Domusgpt/agent-swarm",
      description:
        "Multi-agent AI orchestration framework — coordinating LLM agents for complex autonomous tasks",
      url: "https://github.com/Domusgpt/agent-swarm",
      homepage: "https://agent-swarm-docs.vercel.app",
      language: "Python",
      languages: { Python: 89000, Shell: 2400, Dockerfile: 1100 },
      topics: ["ai", "agents", "llm", "orchestration", "multi-agent", "python"],
      visibility: "public",
      defaultBranch: "main",
      createdAt: "2025-06-15T08:00:00Z",
      updatedAt: "2026-02-20T09:45:00Z",
      pushedAt: "2026-02-20T09:45:00Z",
      stars: 312,
      forks: 47,
      openIssues: 18,
      branches: makeBranches("main", [
        "feat/tool-use",
        "feat/memory-store",
        "dev/v2-architecture",
        "fix/token-counting",
      ]),
      openPRs: [
        makePR(
          89,
          "Implement persistent vector memory store",
          "domusgpt",
          ["feature", "memory"],
          "2026-02-18T08:00:00Z"
        ),
        makePR(
          87,
          "Add OpenAI function-calling tool adapter",
          "ai-contrib-lena",
          ["feature", "tools"],
          "2026-02-15T14:00:00Z"
        ),
        makePR(
          85,
          "Fix token counting for Claude 3.5 models",
          "domusgpt",
          ["bug", "tokens"],
          "2026-02-13T10:00:00Z"
        ),
      ],
      recentCommits: makeCommits(
        ["domusgpt", "ai-contrib-lena", "domusgpt", "domusgpt"],
        [
          "feat: add agent role definitions with YAML config",
          "feat: implement swarm consensus protocol",
          "fix: prevent infinite delegation loops",
          "refactor: extract message bus into separate package",
          "test: add integration tests for 3-agent pipeline",
          "docs: add architecture diagram to README",
          "chore: pin openai sdk to 1.58.x",
        ],
        "2026-02-20T09:45:00Z"
      ),
      actionsStatus: makeActionsRun("Tests", "completed", "success", "2026-02-20T10:00:00Z"),
      tags: {
        category: "ai",
        status: "active",
        priority: "critical",
        group: "ai-ml",
        custom: ["llm", "agents", "orchestration"],
      },
      lastDiscoveredAt: now,
      lastEnrichedAt: now,
    },

    // 5. clear-seas-website
    {
      id: "clear-seas-website",
      fullName: "Domusgpt/clear-seas-website",
      description:
        "Corporate website for Clear Seas Consulting — built with Next.js 15, Tailwind, and Sanity CMS",
      url: "https://github.com/Domusgpt/clear-seas-website",
      homepage: "https://clearseas.io",
      language: "TypeScript",
      languages: { TypeScript: 38000, CSS: 8400, JavaScript: 1200 },
      topics: ["nextjs", "tailwind", "sanity", "corporate", "website"],
      visibility: "private",
      defaultBranch: "main",
      createdAt: "2025-09-05T14:00:00Z",
      updatedAt: "2026-01-28T17:30:00Z",
      pushedAt: "2026-01-28T17:30:00Z",
      stars: 0,
      forks: 0,
      openIssues: 1,
      branches: makeBranches("main", ["staging", "content-updates"]),
      openPRs: [],
      recentCommits: makeCommits(
        ["domusgpt"],
        [
          "fix: update copyright year to 2026",
          "content: add Q1 blog posts from CMS",
          "perf: optimize hero image with next/image",
        ],
        "2026-01-28T17:30:00Z"
      ),
      actionsStatus: makeActionsRun("Deploy", "completed", "success", "2026-01-28T18:00:00Z"),
      tags: {
        category: "website",
        status: "delivered",
        priority: "low",
        group: "client-work",
        custom: ["nextjs", "cms"],
      },
      lastDiscoveredAt: now,
      lastEnrichedAt: now,
    },

    // 6. research-papers
    {
      id: "research-papers",
      fullName: "Domusgpt/research-papers",
      description:
        "Academic research papers and experiment notebooks on generative AI, spatial computing, and HCI",
      url: "https://github.com/Domusgpt/research-papers",
      homepage: null,
      language: "Jupyter Notebook",
      languages: { "Jupyter Notebook": 124000, Python: 32000, TeX: 18000 },
      topics: ["research", "papers", "generative-ai", "hci", "spatial-computing"],
      visibility: "public",
      defaultBranch: "main",
      createdAt: "2025-03-10T10:00:00Z",
      updatedAt: "2026-02-10T13:00:00Z",
      pushedAt: "2026-02-10T13:00:00Z",
      stars: 58,
      forks: 12,
      openIssues: 3,
      branches: makeBranches("main", [
        "draft/vibration-perception",
        "draft/swarm-intelligence-survey",
      ]),
      openPRs: [
        makePR(
          7,
          "Add experiment results for vibration perception study",
          "domusgpt",
          ["research", "draft"],
          "2026-02-08T09:00:00Z"
        ),
      ],
      recentCommits: makeCommits(
        ["domusgpt", "research-collab-jin"],
        [
          "data: add survey responses batch 3",
          "notebook: analyze vibration frequency preferences",
          "tex: draft introduction for spatial audio paper",
          "fix: correct statistical test in experiment 2",
        ],
        "2026-02-10T13:00:00Z"
      ),
      actionsStatus: null,
      tags: {
        category: "research",
        status: "research",
        priority: "medium",
        group: "research",
        custom: ["papers", "notebooks", "experiments"],
      },
      lastDiscoveredAt: now,
      lastEnrichedAt: now,
    },

    // 7. infra-terraform
    {
      id: "infra-terraform",
      fullName: "Domusgpt/infra-terraform",
      description:
        "Infrastructure as Code — Terraform modules for GCP, Vercel, and GitHub org management",
      url: "https://github.com/Domusgpt/infra-terraform",
      homepage: null,
      language: "HCL",
      languages: { HCL: 28000, Shell: 4200, YAML: 2800 },
      topics: ["terraform", "iac", "gcp", "devops", "infrastructure"],
      visibility: "private",
      defaultBranch: "main",
      createdAt: "2025-07-22T11:00:00Z",
      updatedAt: "2026-02-18T16:00:00Z",
      pushedAt: "2026-02-18T16:00:00Z",
      stars: 0,
      forks: 0,
      openIssues: 4,
      branches: makeBranches("main", [
        "feat/cloud-run-module",
        "chore/upgrade-provider",
      ]),
      openPRs: [
        makePR(
          34,
          "Add Cloud Run service module with auto-scaling",
          "domusgpt",
          ["infrastructure", "gcp"],
          "2026-02-16T14:00:00Z"
        ),
        makePR(
          33,
          "Upgrade Google provider to 6.x",
          "infra-bot",
          ["dependencies", "chore"],
          "2026-02-15T09:00:00Z"
        ),
      ],
      recentCommits: makeCommits(
        ["domusgpt", "infra-bot"],
        [
          "feat: add Firestore backup scheduled job",
          "fix: correct IAM binding for Cloud Build SA",
          "chore: terraform fmt all modules",
          "feat: add Vercel project resource for geometric-lab",
          "docs: document module inputs and outputs",
        ],
        "2026-02-18T16:00:00Z"
      ),
      actionsStatus: makeActionsRun(
        "Terraform Plan",
        "completed",
        "success",
        "2026-02-18T16:15:00Z"
      ),
      tags: {
        category: "infrastructure",
        status: "active",
        priority: "high",
        group: "devops",
        custom: ["terraform", "gcp", "iac"],
      },
      lastDiscoveredAt: now,
      lastEnrichedAt: now,
    },

    // 8. creative-ml-gallery
    {
      id: "creative-ml-gallery",
      fullName: "Domusgpt/creative-ml-gallery",
      description:
        "Web gallery showcasing ML-generated art — Stable Diffusion, ControlNet, and custom LoRA outputs",
      url: "https://github.com/Domusgpt/creative-ml-gallery",
      homepage: "https://ml-gallery.domusgpt.dev",
      language: "TypeScript",
      languages: { TypeScript: 31000, Python: 14000, CSS: 6200 },
      topics: [
        "ml-art",
        "stable-diffusion",
        "gallery",
        "generative",
        "lora",
        "react",
      ],
      visibility: "public",
      defaultBranch: "main",
      createdAt: "2025-12-01T09:00:00Z",
      updatedAt: "2026-02-16T19:30:00Z",
      pushedAt: "2026-02-16T19:30:00Z",
      stars: 73,
      forks: 11,
      openIssues: 6,
      branches: makeBranches("main", [
        "feat/image-zoom",
        "feat/prompt-display",
        "experiment/video-gen",
      ]),
      openPRs: [
        makePR(
          18,
          "Add lightbox with pinch-to-zoom on mobile",
          "gallery-contrib-alex",
          ["feature", "ui"],
          "2026-02-13T16:00:00Z"
        ),
        makePR(
          16,
          "Display generation prompts and parameters on hover",
          "domusgpt",
          ["feature", "ux"],
          "2026-02-09T11:00:00Z"
        ),
      ],
      recentCommits: makeCommits(
        ["domusgpt", "gallery-contrib-alex", "domusgpt"],
        [
          "feat: add batch upload script for new artworks",
          "style: redesign grid layout for variable aspect ratios",
          "fix: lazy loading not triggering on slow connections",
          "feat: add EXIF-style metadata panel for generation params",
          "chore: compress existing gallery images with sharp",
        ],
        "2026-02-16T19:30:00Z"
      ),
      actionsStatus: makeActionsRun(
        "Deploy Preview",
        "completed",
        "success",
        "2026-02-16T19:45:00Z"
      ),
      tags: {
        category: "creative",
        status: "beta",
        priority: "medium",
        group: "ai-ml",
        custom: ["gallery", "stable-diffusion", "art"],
      },
      lastDiscoveredAt: now,
      lastEnrichedAt: now,
    },
  ];
}
