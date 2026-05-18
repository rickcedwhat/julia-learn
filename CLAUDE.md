# CLAUDE.md

Guidance for Claude Code when working in this repository.
See `AGENTS.md` for shared conventions (branch naming, commit style, PR rules, env vars).

---

## Isolation

Claude uses **git worktrees**. Each task gets its own working directory — never modify the main checkout or switch branches manually. When starting a task, a worktree is created automatically.

---

## Tech Stack

| Layer | Tool |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS v3 (mobile-first) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Google OAuth |
| AI — chat | Gemini 2.0 Flash |
| AI — OCR | Gemini 2.0 Flash (or 1.5 Flash) with vision |
| PWA | vite-plugin-pwa |
| E2E tests | Playwright |

All app code lives in `/app`. Docs (VitePress) live in `/docs`.

---

## Commands

```bash
# From /app
npm install                  # install dependencies
npm run dev                  # dev server at http://localhost:5173
npm run build                # production build
npm run typecheck            # tsc --noEmit
npm run lint                 # ESLint
npm run test:e2e             # Playwright E2E (Phase 3)

# From repo root
npm run docs:dev             # VitePress docs at http://localhost:5174
```

---

## Key Files (once app is scaffolded)

| File | Purpose |
|---|---|
| `app/src/lib/supabase.ts` | Supabase client singleton |
| `app/src/lib/gemini.ts` | Gemini API helpers (chat + OCR) |
| `app/src/hooks/useAuth.ts` | Auth state, sign in/out |
| `app/src/hooks/useWorkingMeal.ts` | Working meal state (chat context) |
| `app/src/components/MacroCard.tsx` | 6-macro display card (reused everywhere) |
| `supabase/migrations/` | Schema migration files — one per change |

---

## Canonical Macro Fields

Every label, batch, and meal card must show these **six fields in this exact order**:

1. Calories (kcal)
2. Protein (g)
3. Fat (g)
4. Total Carbs (g)
5. Fiber (g)
6. Sugar (g)

If a value is missing, show `—` — never hide the row. This is a hard requirement from the app spec.

---

## Density Targets

Compute on every meal update:
- **Protein**: `calories × 0.05` grams minimum
- **Fiber**: `calories × 0.015` grams minimum

Show pass/fail badges on the macro card.

---

## Kickoff Export Format

```
LOG | [Meal Name] | [HH:MM] | [Calories] | [Protein] | [Carbs] | [Sugar] | [Fat] | [Fiber]
```

This exact format, copied to clipboard via `navigator.clipboard.writeText()`.

---

## Before Opening a PR

1. Rebase onto latest main:
   ```bash
   git fetch origin && git rebase origin/main
   ```
2. Run the checklist from `AGENTS.md`
3. Open as ready for review: `gh pr create` (no `--draft`)
   - Only use `--draft` if the work is genuinely incomplete and needs saving mid-flight

See `AGENTS.md` → PR Rules.

---

## Supabase Schema Notes

- All tables have `user_id uuid references auth.users(id)` — this is nullable during Phase 1 development but must be populated once auth is wired.
- RLS (row-level security) is enabled in Phase 1 auth PR. Don't disable it.
- Schema changes go in `supabase/migrations/` — never edit via dashboard without a matching file.

---

## Architecture Reference

See `docs/architecture.md` for Mermaid diagrams covering:
- Data model (ERD)
- Chat flow (working meal → log/save)
- Recipe → Batch → Portion
- Auto-tag system
- Label origin types
