# Oxc tooling migration

Status: implemented. TypeScript 7, Oxc, formatting normalization, and staged-hook
verification pass. See the [verification note](../.agents/notes/implemented/tooling/2026-09-27-oxc-migration.md)
for coverage differences and the remaining manual Zed GUI check.

## Outcome

Use Oxlint for linting, Oxfmt for code/config formatting, and Prettier for
Markdown. Run staged-file checks through lint-staged and Husky. Keep whole-project
checks in CI; hooks are developer feedback, not the enforcement boundary.

Reference: Holabrisa's `web/.oxlintrc.jsonc`, `web/.oxfmtrc.json`,
`.lintstagedrc.js`, `.husky/pre-commit`, and root/web package scripts.
Adopt its sequential formatter-then-linter workflow and 100-column formatting.
Do not copy monorepo paths, Supabase ignores, Vitest, Python hooks, or asdf setup.

## 1. Check compatibility before removing ESLint

- Capture the resolved ESLint rules for application, config, and test files.
  Use `@oxlint/migrate --type-aware --js-plugins=false` as a starting point;
  review the output rather than retaining every generated override blindly.
- Candidate versions verified in npm on 2026-09-27: `oxlint@1.85.0`,
  `oxlint-tsgolint@7.0.2003`, and `oxfmt@0.70.0`. Pin the chosen versions.
  Oxfmt is pre-1.0; do not assume semver protects formatting output.
- The user approved upgrading to stable TypeScript 7 before Oxc. Use Next's
  `experimental.useTypeScriptCli`, explicit ambient types, and the relative
  `@/*` → `./src/*` mapping without `baseUrl`. Keep `tsc --noEmit` as the
  compiler check. Typecheck, tests, and the production build pass with 7.0.2.

## 2. Replace the linter

- Add `.oxlintrc.jsonc` with TypeScript, React/hooks, Next.js, and accessibility
  coverage. Preserve relevant existing severities/options, not just defaults.
- Explicitly enable hooks rules, including `react/set-state-in-effect`.
  Preserve promise checks, inline type imports, unused-argument `_` handling,
  and the `node:test` exception for `no-floating-promises`.
- Preserve disabled `require-await`, `array-type`, and
  `consistent-type-definitions` rules. Do not introduce warning-as-error policy.
- Record rule differences: native `react/no-deprecated` and React Compiler
  `config`/`gating` have no equivalent. Proposed trade-off: accept these omissions
  rather than retain ESLint or alpha JS-plugin machinery. Review other omissions
  from the resolved-config comparison before committing the replacement.
- Keep `scripts/**` and `channels.js` outside lint scope. Exclude build output,
  dependencies, vendored `.agents/skills/**`, and local editor/agent artifacts.
  Retain application UI lint coverage. Convert the hooks suppression in
  `src/components/VideoDisplay.tsx` to the matching Oxlint rule/directive.
- Install Oxlint and its compatible tsgolint backend; remove `eslint`,
  `eslint-config-next`, `typescript-eslint`, and `eslint.config.mjs` once verified.
  Check the lockfile for unintended retained ESLint dependencies.

## 3. Give each formatter one job

- Add `.oxfmtrc.json`: `printWidth: 100`, explicit import groups matching the
  React → Next → dependencies → aliases → relative intent, and no side-effect
  import reordering. Disable package.json key sorting to avoid unrelated churn.
- Use native Tailwind sorting with `config: "./tailwind.config.ts"` (Tailwind 3),
  plus `cn`, `clsx`, and `cva`. Verify nested variants and import ordering on
  representative files; output need not be identical to the Prettier plugins.
- Ignore Markdown/MDX, build output, dependencies, local artifacts, vendored
  skills, and generated shadcn `src/components/ui/**` in Oxfmt. Keep the
  script-managed `channels.js` out of formatter churn; retain `check-channels`.
- Keep Prettier with a plugin-free config for Markdown/MDX. Remove
  `@ianvs/prettier-plugin-sort-imports` and `prettier-plugin-tailwindcss`.
  Do not use a code-excluding `.prettierignore`: Oxfmt reads that file too.
- Explicitly exclude the user's untracked `biome.jsonc` from Oxfmt; untracked
  files are not automatically ignored. Biome is not part of the shared workflow.
  Avoid competing editor formatters; document language-specific
  Oxfmt/Prettier selection without overwriting personal editor settings.

## 4. Wire scripts and staged checks

- `lint`: `oxlint --type-aware`; `lint:fix`: add `--fix`.
  Keep `typecheck: tsc --noEmit`; do not copy Holabrisa's `--type-check` yet.
- Add `format` and `format:check` for Oxfmt plus Markdown Prettier, using the same
  exclusions. Include owned Markdown under `.agents/notes` and `plans`.
- Add `husky@9.1.7` and `lint-staged@17.2.0`, matching Holabrisa; add
  `prepare: husky` and a `lint-staged` script. Update `pnpm-lock.yaml` with pnpm.
- Add `.lintstagedrc.js` (CommonJS) and executable `.husky/pre-commit` containing
  `pnpm exec lint-staged`. Do not commit Husky's generated `_` directory.
- Use non-overlapping file groups: Markdown → Prettier; supported code/config
  files → Oxfmt, then one whole-project `pnpm lint`. Lint is read-only in the
  hook; do not run repository-wide autofixes during a partial commit.
- Use a string formatter task followed by a function-returned `pnpm lint` task.
  lint-staged passes formatter filenames as native argv and omits them for lint.
  No manual quoting or bare `files.join(" ")`; handle all-ignored inputs gracefully.
- Retain lint-staged's default backup and partial-staging protection. Do not
  add `git add .`, disable the stash, or run a build in the pre-commit hook.
- Whole-project lint reads the working tree, not a pure staged snapshot: unrelated
  unstaged-only edits can change the result. Accept this Holabrisa trade-off for
  local feedback; clean-checkout CI remains authoritative. Test this case too.

## 5. CI, documentation, and verification

- Add `pnpm format:check` to CI. Retain frozen install, channel validation,
  typecheck, lint, tests, and production build. Set `HUSKY=0` for CI installation.
- Update active tooling guidance in `AGENTS.md` and `README.md`; preserve
  historical validation evidence in audit notes. Keep exclusion documentation
  aligned with the linter and TypeScript configuration.
- Apply mechanical formatting separately from source fixes and tooling setup.
  Ensure formatting is idempotent and a second check produces no changes.
- Run all CI commands locally. Exercise the actual hook in a disposable fixture
  with passing/failing lint, Markdown-only changes, filenames containing spaces,
  ignored-only inputs, and partially staged edits. Confirm failures block commits
  and unstaged content survives. Test a commit from Zed without hardcoded PATHs.
- No browser parity run is needed for configuration/formatting-only changes.
  If rule fixes alter behavior, apply the migration browser checklist to those
  changes and keep their commits separate.

## Commit boundaries

1. Oxc packages, configs, scripts, and ESLint/Prettier-plugin removal.
2. Mechanical formatting normalization, separate from behavioral fixes.
3. lint-staged/Husky, CI format checks, active documentation, and verification.

If lint rules require behavioral fixes, make focused, tested commits before
activating the hook. Do not disable checks just to get intermediate commits through.

Treat the series as one migration: validate it together before pushing for review.
The tooling note lives under `implemented` with the verification results.

## Sources

- [Oxlint migration](https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint.html)
- [Type-aware compatibility](https://oxc.rs/docs/guide/usage/linter/type-aware.html)
- [React Compiler rules and gaps](https://oxc.rs/blog/2026-08-18-react-compiler-support.html)
- [Oxfmt sorting](https://oxc.rs/docs/guide/usage/formatter/sorting.html)
- [Oxfmt ignores](https://oxc.rs/docs/guide/usage/formatter/ignore-files.html)
