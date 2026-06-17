# eve Agent App

This project uses the eve framework. Before writing code, always read the relevant guide in `node_modules/eve/docs/`.

## Coding rules

Follow **[CODING_GUIDELINE.md](CODING_GUIDELINE.md)** (the canonical guide for humans and agents) and its distilled, AI-facing rules under `.claude/rules/`:

- `common/coding-style.md` — immutability, naming, `#` imports, eve export rules
- `common/development-workflow.md` — pnpm + eve + tsgo + oxlint/oxfmt + fallow commands
- `common/testing.md` — eve evals (`defineEval`, assertions, gate vs soft)
- `common/security.md` — trust boundaries, `process.env` secrets, channel auth
- `typescript/project-structure.md` — `agent/` slots, `evals/`, the `#` alias
- `typescript/better-result.md` — typed errors, Result at expected-failure boundaries
- `typescript/valibot-validation.md` — boundary validation, `InferOutput`

TypeScript under `agent/**` and `evals/**` also has two PostToolUse guards in `.claude/settings.json`: no relative imports (use `#`) and no `interface` (use `type`).

## Behavioral Guidelines

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## Toolchain

Coding conventions live in `CODING_GUIDELINE.md`. The toolchain:

- **tsgo** (`pnpm typecheck`) — type checking. Do not use `tsc`.
- **oxlint** (`pnpm lint`) — linter (`.oxlintrc.json`).
- **oxfmt** (`pnpm format`) — formatter (`.oxfmtrc.json`). Don't format by hand.
- **eve** (`pnpm dev` / `pnpm build` / `pnpm start` / `pnpm eval`) — runtime, build, and evals.

`pnpm check` runs type + lint + format-check together; `pnpm fix` applies lint and format fixes.

- **fallow** (`pnpm fallow`) — unused code, duplication, cycles, complexity, and architecture drift (not lint/format/type-check). `.fallowrc.json` configures entry points and ignores. Subcommands: `pnpm fallow:dead-code` / `pnpm fallow:audit` / `pnpm fallow:health` / `pnpm fallow:fix`. To enable MCP integration, add `{"mcpServers":{"fallow":{"command":"fallow-mcp"}}}` to `.mcp.json`.

---

<!-- fallow:setup-hooks:start -->

## Fallow local gate

Before any `git commit` or `git push`, run `fallow audit --format json --quiet --explain --gate-marker agent`. If the verdict is `fail`, fix the reported findings before retrying. Treat JSON runtime errors like `{ "error": true, ... }` as non-blocking.

Audit defaults to `gate=new-only`: only findings introduced by the current changeset affect the verdict. Inherited findings on touched files are reported under `attribution` and annotated with `introduced: false`, but do not block the commit. Set `[audit] gate = "all"` in `fallow.toml` to gate every finding in changed files.

For non-skill agents, treat the task map below as the local onboarding source: run the listed fallow command before destructive edits, before commits, and before pull request handoff.

## Fallow task map

| When the agent is about to...     | Run                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------ |
| delete an "unused" export or file | `fallow dead-code --trace <file>:<export>`                                           |
| delete an "unused" dependency     | `fallow dead-code --trace-dependency <name>`                                         |
| commit or open a PR               | `fallow audit --base <ref>`                                                          |
| prioritize refactoring            | `fallow health --hotspots --targets`                                                 |
| ask who owns code                 | `fallow health --ownership`                                                          |
| check untested-but-reachable code | `fallow health --coverage-gaps`                                                      |
| consolidate duplication           | `fallow dupes --trace dup:<fingerprint>`                                             |
| find feature flags                | `fallow flags`                                                                       |
| surface security candidates       | `fallow security`                                                                    |
| understand a finding              | `fallow explain <issue-type>`                                                        |
| scope a monorepo                  | `--workspace <glob> / --changed-workspaces <ref>` (global flags, prefix any command) |

<!-- fallow:setup-hooks:end -->
