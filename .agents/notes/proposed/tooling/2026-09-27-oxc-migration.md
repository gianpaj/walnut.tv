# Oxc migration proposal

## Intent

Replace ESLint with Oxlint and code formatting with Oxfmt. Keep Prettier for
Markdown. Use Holabrisa's lint-staged/Husky workflow without its monorepo and
Python machinery. The [migration plan](../../../../plans/2026-09-27-oxc-tooling-migration.md)
is the canonical implementation checklist.

## Constraints

Keep type-aware linting and the separate TypeScript compiler check. The user
approved TypeScript 7 first; its CLI/build compatibility is recorded in the
[compiler note](../../implemented/tooling/2026-09-27-typescript-7.md).

Prefer native rules over an ESLint fallback or alpha JS-plugin layer. The plan
names coverage differences for review. Formatter and hook commands must leave
vendored skills, script-managed channel data, and personal tooling files alone.

## Evidence

Read Holabrisa's Oxc configs, lint-staged config, hook, and package scripts;
compared them with this repo's ESLint, Prettier, TypeScript, and CI configuration.
Installed Oxlint 1.85.0, tsgolint 7.0.2003, and Oxfmt 0.70.0. Native rules map the
resolved ESLint baseline, with the omissions listed in `.oxlintrc.jsonc`.
Oxlint reports zero errors/warnings across 49 files; TypeScript 7 typecheck and
18 tests pass. `pnpm why` reports no ESLint dependency chain.

Oxfmt configuration probes passed for import groups, relative side-effect import
order, Tailwind 3 classes and nested variants, ignore rules, and idempotence.
Ordinary imports can cross side-effect imports; review normalization diffs.
Formatting normalization and staged-hook verification remain open.
