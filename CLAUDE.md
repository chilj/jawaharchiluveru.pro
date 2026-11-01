# Working on this repo

- **Always show a preview before merging to `main`.** Work on a short-lived local branch, build
  it, publish a preview the owner can click through, and merge to `main` (which deploys the live
  site) only after they approve. Pushing the branch is fine (only `main` deploys); this
  environment can't delete remote branches, so ask the owner to delete merged ones.
- Content lives in `content/`; `apps/web/` renders it. See README.md for the content model,
  the `status` flags (planned / draft / published) and the editor at `/admin`.
- `npm run build` is the live site; `npm run build:review` also renders planned and draft entries.
