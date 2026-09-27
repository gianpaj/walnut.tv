/** @type {import("lint-staged").Configuration} */
module.exports = {
  "*.{md,mdx}": "prettier --write --ignore-path .prettierignore --ignore-path .gitignore --",
  "*.{js,jsx,cjs,mjs,ts,tsx,cts,mts,json,jsonc,webmanifest,css,yml,yaml}": [
    // String tasks pass filenames as argv, preserving spaces and quotes without a shell.
    "oxfmt --write --no-error-on-unmatched-pattern --",
    // Function tasks omit filenames so type-aware lint checks the whole program.
    () => "pnpm lint",
  ],
};
