import { describe, expect, it } from 'vitest';
import { requireSuccessfulValidation } from '../../scripts/verify-release-validation.mjs';

const repository = 'qianhou0627/TIZI';
const sha = 'a'.repeat(40);
const workflow = { id: 10, path: '.github/workflows/validate.yml', state: 'active' };
const success = {
  id: 20,
  workflow_id: 10,
  head_sha: sha,
  head_branch: 'main',
  head_repository: { full_name: repository },
  event: 'push',
  status: 'completed',
  conclusion: 'success'
};
const check = (runs, evidence = workflow) => requireSuccessfulValidation({ workflow: evidence, runs, repository, sha });

describe('release validation evidence', () => {
  it('reuses a successful exact-commit main validation', () => {
    expect(check([success])).toEqual(success);
    expect(check([{ ...success, event: 'workflow_dispatch' }]).id).toBe(20);
  });
  it.each([
    { head_sha: 'b'.repeat(40) },
    { head_branch: 'other' },
    { workflow_id: 99 },
    { head_repository: { full_name: 'other/TIZI' } },
    { event: 'pull_request' },
    { status: 'in_progress' },
    { conclusion: 'failure' }
  ])('rejects mismatched or incomplete evidence %j', (change) => {
    expect(() => check([{ ...success, ...change }])).toThrow();
  });
  it('does not hide a newer failure or pending run behind an older success', () => {
    for (const change of [{ conclusion: 'failure' }, { status: 'in_progress', conclusion: null }]) {
      expect(() => check([success, { ...success, id: 21, ...change }])).toThrow();
    }
  });
  it('fails closed when no evidence or a different workflow is returned', () => {
    expect(() => check([])).toThrow();
    expect(() => check([success], { ...workflow, path: '.github/workflows/other.yml' })).toThrow();
    expect(() => check([success], { ...workflow, state: 'disabled_manually' })).toThrow();
  });
});
