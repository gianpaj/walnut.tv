# TypeScript 7

## Decision

Use stable `typescript@7.0.2` and Next.js 16.2.12's
`experimental.useTypeScriptCli`. TypeScript 7 has no JavaScript compiler API;
Next's CLI mode preserves build-time checks without keeping a second compiler.
`pnpm typecheck` runs `tsc --noEmit`.

`tsconfig.json` uses explicit ambient types for Node, React, React DOM, and
YouTube, with an explicit relative `@/*` mapping and no `baseUrl`. Vendored skill
and local agent/editor directories are outside the TypeScript program.

## Verification

Passed with Node 24.9.0: TypeScript 7.0.2 typecheck, 18 tests, channel validation,
and the production build. No application behavior or declarations changed.
The Prettier config's JSDoc uses the exported plugin types.

TS7 retained cached missing-YouTube diagnostics after updating `types`.
Fresh and non-incremental checks passed; deleting the disposable
`tsconfig.tsbuildinfo` resolved the ordinary incremental run. Keep incremental
checking enabled; invalidate its cache if this configuration-change bug recurs.

ESLint's typescript-eslint dependency rejects TS7. The Oxc migration replaces
that dependency in the following tooling commit; this intermediate commit is
not a standalone all-green lint baseline. Do not add a TS6 compatibility compiler.
