import { Octokit } from "@octokit/rest";

/**
 * Create an authenticated Octokit instance.
 */
export function createGitHubClient(token: string): Octokit {
  return new Octokit({
    auth: token,
    userAgent: "project-ontology/1.0.0",
    throttle: {
      onRateLimit: (retryAfter: number, options: Record<string, unknown>, octokit: Octokit) => {
        octokit.log.warn(
          `Rate limit hit for ${String(options.method)} ${String(options.url)} — retrying after ${retryAfter}s`
        );
        return true; // retry once
      },
      onSecondaryRateLimit: (_retryAfter: number, options: Record<string, unknown>, octokit: Octokit) => {
        octokit.log.warn(
          `Secondary rate limit hit for ${String(options.method)} ${String(options.url)}`
        );
        return false;
      },
    },
  });
}

/**
 * Paginate through ALL repositories in an organization.
 */
export async function listOrgRepos(
  octokit: Octokit,
  org: string
): Promise<
  Awaited<
    ReturnType<typeof octokit.repos.listForOrg>
  >["data"]
> {
  const repos = await octokit.paginate(octokit.repos.listForOrg, {
    org,
    type: "all",
    sort: "updated",
    direction: "desc",
    per_page: 100,
  });
  return repos;
}
