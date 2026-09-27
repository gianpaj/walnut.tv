# Oxc migration proposal

## Intent

Replace ESLint with Oxlint and code formatting with Oxfmt. Keep Prettier for
Markdown. Use Holabrisa's lint-staged/Husky workflow without its monorepo and
Python machinery. The [migration plan](../../../../plans/2026-09-27-oxc-tooling-migration.md)
is the canonical implementation checklist.

## Constraints

Keep type-aware linting and the separate TypeScript compiler check. Current
Oxlint's backend uses TypeScript 7 semantics; this repo has TypeScript 5 and
`baseUrl`. Validate compatibility before removing ESLint. A required compiler
upgrade needs separate approval.

Prefer native rules over an ESLint fallback or alpha JS-plugin layer. The plan
names coverage differences for review. Formatter and hook commands must leave
vendored skills, script-managed channel data, and personal tooling files alone.

## Evidence

Read Holabrisa's Oxc configs, lint-staged config, hook, and package scripts;
compared them with this repo's ESLint, Prettier, TypeScript, and CI configuration.
Reviewed official Oxc documentation and npm version metadata. No Oxc packages
were installed, no hook was activated, and no tool compatibility claim has been
validated by executing Oxc. Implementation awaits plan approval.
