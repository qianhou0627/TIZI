import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function requireSuccessfulValidation({ workflow, runs, repository, sha }) {
  if (!/^[a-f0-9]{40}$/.test(sha ?? '') || !/^[\w.-]+\/[\w.-]+$/.test(repository ?? '')) {
    throw new Error('Invalid release repository or commit');
  }
  if (workflow?.path !== '.github/workflows/validate.yml' || workflow.state !== 'active' || !workflow.id) {
    throw new Error('Validate workflow identity is invalid');
  }
  const latest = runs
    .filter(
      (run) =>
        run.workflow_id === workflow.id &&
        run.head_sha === sha &&
        run.head_branch === 'main' &&
        run.head_repository?.full_name === repository &&
        ['push', 'workflow_dispatch'].includes(run.event)
    )
    .sort((left, right) => right.id - left.id)[0];
  if (!latest || latest.status !== 'completed' || latest.conclusion !== 'success') {
    throw new Error('The latest main Validate run for this exact commit must succeed before packaging');
  }
  return latest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const repository = process.env.GITHUB_REPOSITORY;
  const sha = process.env.GITHUB_SHA;
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? '') || !/^[a-f0-9]{40}$/.test(sha ?? '')) {
    throw new Error('GITHUB_REPOSITORY and full GITHUB_SHA are required');
  }
  function api(endpoint) {
    try {
      return JSON.parse(
        execFileSync('gh', ['api', endpoint], {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: 45_000,
          maxBuffer: 8 * 1024 * 1024
        })
      );
    } catch {
      throw new Error('Unable to read Validate evidence from GitHub; packaging stopped');
    }
  }
  const workflow = api(`repos/${repository}/actions/workflows/validate.yml`);
  const result = api(`repos/${repository}/actions/workflows/validate.yml/runs?head_sha=${sha}&per_page=100`);
  const run = requireSuccessfulValidation({ workflow, runs: result.workflow_runs, repository, sha });
  console.log(`Reusing successful Validate run ${run.id} for commit ${sha}`);
}
