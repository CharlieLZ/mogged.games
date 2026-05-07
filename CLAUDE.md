# CLAUDE.md — mogged

## Tech Stack
- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS 4 with token-based theming
- Radix UI (Dialog, ScrollArea, Badge, Button, Card, Tabs, Switch, Progress, Accordion, DropdownMenu)
- AI SDK for image generation (KIE Market provider)
- Drizzle ORM + PostgreSQL for server-side data
- next-intl for i18n (9 locales: ar, de, en, es, fr, it, ja, ko, zh)
- Vitest + Playwright for testing
- Stripe embedded checkout for payments

## Build & Verify Commands
```bash
pnpm typecheck          # tsc --noEmit
pnpm lint               # eslint .
pnpm lint:strict        # eslint --max-warnings=0
pnpm test:unit          # run-tracked-vitest (all tracked test files)
pnpm test:e2e           # playwright test

# Git hooks (auto-installed)
pnpm typecheck          # pre-commit gate
pnpm lint:strict && pnpm typecheck && pnpm test:unit && pnpm content:verify-frontmatter  # pre-push gate
```

## Git Workspace Rules
- Keep the project root on `main` by default. Use it only to sync the trunk, inspect the baseline, and occasionally run the main version.
- Before starting new work from the project root:

```bash
git switch main
git pull --ff-only
git status --short --branch
```

- Do not make feature changes directly in the project root. Create an isolated worktree from `main`:

```bash
git worktree add .worktrees/<task-name> -b <branch-name> main
cd .worktrees/<task-name>
```

- Before starting a dev server, verify the current directory and branch:

```bash
pwd
git branch --show-current
```

- After the branch is merged, clean up the local worktree and branch:

```bash
cd <project-root>
git worktree remove .worktrees/<task-name>
git branch -d <branch-name>
git fetch --prune
```

- Use these commands to identify where work is happening:

```bash
git worktree list
git status --short --branch
git branch --show-current
```

- Core rule: the root checkout represents `main`; feature work happens in `.worktrees/<task-name>`; merged branches are cleaned up immediately.

## Code Conventions
- **No hardcoded colors** — always use Tailwind semantic tokens (`text-foreground`, `bg-card`, `border-border`, etc.)
- **WCAG AA contrast** — Google Material color standard, ≥4.5 contrast ratio
- **No comments** unless explaining non-obvious logic
- **Structured error logging** — all `console.error` includes `{ step, userId/taskId, error }` context
- **AbortController** pattern for async operations that need cancellation
- **Input validation** with null fallbacks; `AbortError` / `TimeoutError` explicitly handled
- **fail-fast** on missing config; no swallowed exceptions
- **Always `finally` cleanup** — revoke blob URLs, set loading states to false

## Project Structure (key paths)
```
src/
  app/[locale]/          # Next.js App Router pages
  config/locale/messages/{locale}/  # i18n JSON (ai/image.json, pricing.json, landing.json, etc.)
  shared/
    blocks/generator/    # Generator UI blocks (image-workspace, video-workspace, history panel, etc.)
    components/ui/       # Radix-based UI primitives (button, card, badge, tabs, etc.)
    lib/                 # Shared utilities (pricing, brand tokens, upload, task history, etc.)
    contexts/            # React contexts (app context)
    hooks/               # Custom hooks (use-viewer-info, etc.)
    models/              # DB models (Drizzle)
  extensions/ai/         # AI SDK provider adapters (kie-market, types)
```

## i18n
- All user-facing strings in `src/config/locale/messages/{locale}/` JSON files
- Use `{{app_domain}}`, `{{app_name}}`, `{{credits_tip}}` tokens for dynamic branding
- Test expectations must match actual JSON values exactly (case-sensitive, full strings)

## Testing
- Tests run via `node scripts/run-tracked-vitest.mjs` (filters to git-tracked test files)
- Pre-existing `page.test.ts` failure: `headers()` unavailable in jsdom — use `--no-verify` to bypass if needed
- `sonner` toast and `next-intl` are globally mocked in test fixtures
