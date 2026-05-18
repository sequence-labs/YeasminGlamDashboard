# Makeup Artist Hub Implementation Rules

## Edit Rules

- Never use full-file replace/delete-style edits.
- Keep changes scoped to the active work package.
- Prefer existing workspace package boundaries.
- Do not edit generated API client or generated Zod files by hand; update the OpenAPI source and regenerate if contract changes are required.
- Avoid unrelated formatting churn.

## Testing Rules

- Run focused package checks after changing a package.
- Run root `pnpm run typecheck` before completion when feasible.
- For rendered frontend work, verify in the built-in Browser and inspect console output.
- Record failed commands in `Documentation.md` before fixing or changing direction.

## Documentation Rules

- Update `Documentation.md` after meaningful subtasks.
- Update `Plan.md` when acceptance criteria, validation commands, or status changes.
- Update `Setup.md` when local setup or environment assumptions change.
- Update `Prompt.md` when product goals, non-goals, or scope changes.

## Git and Worktree Rules

- Preserve user changes.
- Do not run destructive git commands unless explicitly requested.
- Use branch names with the `codex/` prefix if creating a branch.
- Commit messages must start with `Commit #N - `, where `N` is the next commit number.

## Done Definition

The requested work is done only when relevant acceptance criteria are met, validation has been run, failures are fixed or documented, `Documentation.md` is current, and the final diff remains scoped.
