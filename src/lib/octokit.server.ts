import { Octokit } from 'octokit';

declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var
  var octokit: Octokit | undefined;
}

export const octokit =
  global.octokit ||
  new Octokit({
    auth: process.env.GITHUB_PAT,
  });

if (process.env.NODE_ENV !== 'production') global.octokit = octokit;
