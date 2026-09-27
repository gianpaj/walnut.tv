# Oxc tooling and staged checks

## Decision

Use Oxlint 1.85.0 with tsgolint 7.0.2003, Oxfmt 0.70.0 for code/config, and
plugin-free Prettier for Markdown/MDX. TypeScript 7 compatibility is recorded in
[the compiler note](./2026-09-27-typescript-7.md). The implementation followed
[the migration plan](../../../../plans/2026-09-27-oxc-tooling-migration.md).

Holabrisa supplies the sequential format-then-lint pattern and 100-column width.
Reject its Python/monorepo hook machinery and machine-specific PATH setup here.
Native rules replace the resolved ESLint baseline; accepted gaps are React's
`no-deprecated` and Compiler `config`/`gating` checks. JSX usage needs no separate
bookkeeping rules. Native unused-variable checks skip declaration files.
No ESLint fallback, JS-plugin layer, or secondary TypeScript compiler is retained.

Oxfmt owns import grouping and Tailwind 3 sorting for `cn`, `clsx`, and `cva`.
It preserves relative side-effect import order, but ordinary imports can cross
side-effect imports; normalization was reviewed. Configs exclude generated UI
from formatting, script-managed channels, vendored skills, and personal tooling.
Application UI remains linted. The untracked Biome configuration stays untouched.

Husky 9.1.7 runs lint-staged 17.2.0. String tasks receive filenames as native argv;
the following function task runs filename-free whole-project lint without fixes.
Markdown-only commits run Prettier. Default backups and partial-staging protection
remain enabled. Whole-project lint can see unrelated unstaged-only edits.
The user chose local/pre-commit formatting and linting, not CI enforcement.
CI validates channels, types, tests, and the build from a clean checkout.

## Verification

Passed with Node 24.9.0 and pnpm 10.27.0:

- Frozen-lockfile install with `HUSKY=0`, hook installation with `pnpm prepare`.
- Format checks and second-pass idempotence; Tailwind/import/ignore probes.
- Channel check, TS7 typecheck, Oxlint (50 files, zero warnings/errors), 18 tests,
  and production build. `pnpm why` reports no ESLint dependency chain.
- Real Git/Husky fixture commits: code and Markdown formatting, typed-lint failure
  blocking, spaces/quotes/metacharacters in filenames, formatter-ignored files,
  unsupported extensions, partial-staging success/failure restoration, and an
  unrelated unstaged lint error. Harness and logs are local disposable artifacts
  under `/tmp/walnut-hooks-2026-09-27.Povao4/` (`repo-final/`).

Force-added Git-ignored `build/` files fail lint-staged's native restaging step;
do not force-add build output. An actual Zed GUI commit remains untested.
No runtime behavior changed, so no browser parity pass was claimed.
