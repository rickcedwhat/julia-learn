# Agent Conventions

Shared source of truth for all AI agents working on this repo.

---

## Agent Workflow

Claude Code uses **git worktrees**. Each task gets its own isolated working directory — never modify the main checkout or switch branches manually inside a worktree.

---

## Package Manager

**npm**. Do not use `yarn` or `pnpm`. All app work lives in the `/app` subdirectory.

```bash
cd app
npm install          # install dependencies
npm run dev          # start dev server (Vite, port 5173)
npm run build        # production build
npm run typecheck    # tsc --noEmit (fast, no emit)
npm run lint         # ESLint
```

---

## Branch Naming

| Pattern | When to use |
|---|---|
| `feat/<issue>-<slug>` | New feature (e.g. `feat/11-chat-ui`) |
| `fix/<issue>-<slug>` | Bug fix |
| `chore/<slug>` | Tooling, config, deps |
| `docs/<slug>` | Documentation only |

Always include the issue number if one exists.

---

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): message`

Types: `feat` `fix` `docs` `test` `refactor` `chore`

Examples:
```
feat(chat): add working meal state reducer
fix(ocr): handle null fiber field from Gemini response
chore(deps): update @supabase/supabase-js to 2.x
docs: add architecture diagrams
```

---

## Before Opening a PR (mandatory)

```bash
git fetch origin
git rebase origin/main
```

Always rebase onto the latest main before pushing. Even if you think you're up to date.

---

## Pull Request Rules

- **Always open as draft**: `gh pr create --draft`
- Draft signals the PR exists and is trackable but not ready for merge
- Move to "Ready for review" only when the checklist below is complete

---

## PR Checklist

- [ ] `npm run build` passes in `/app`
- [ ] `npm run typecheck` passes (no TypeScript errors)
- [ ] `npm run lint` passes
- [ ] No `TODO` / `FIXME` left in `app/src/`
- [ ] `.env` is NOT committed (only `.env.example` with blank values)
- [ ] Commit messages follow Conventional Commits
- [ ] PR opened as draft

---

## Environment Variables

All secrets live in `/app/.env` which is gitignored. Never commit real values.
`/app/.env.example` IS committed with blank values so agents and teammates know what's needed:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GEMINI_API_KEY=
```

---

## Database Changes

Any Supabase schema change needs a corresponding migration. Do not modify the schema directly in the Supabase dashboard without writing a migration file at `supabase/migrations/<timestamp>_<description>.sql`. This keeps schema history in version control.

---

## Git Hooks (Husky)

Three hooks run automatically after `npm install` at the repo root.

| Hook | What it does |
|---|---|
| `commit-msg` | `commitlint` — rejects commits that don't follow Conventional Commits |
| `pre-commit` | Blocks `.env` from being staged; runs `lint-staged` in `/app` once scaffolded |
| `pre-push` | Rejects push if branch isn't rebased onto `origin/main` |

### lint-staged (add to `app/package.json` in the scaffold PR)

```json
"lint-staged": {
  "src/**/*.{ts,tsx}": [
    "eslint --fix --max-warnings=0",
    "bash -c 'npx tsc --noEmit'"
  ]
}
```

This runs ESLint (with auto-fix) and a full typecheck on every commit touching `app/src/`. Add `lint-staged` as a devDependency in `app/package.json`.

---

## CI

None configured yet (Phase 3). Until then, run `npm run build` and `npm run typecheck` locally before marking a PR ready.
