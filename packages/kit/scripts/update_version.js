import { readFile, writeFile } from 'node:fs/promises'

const pkg = JSON.parse(await readFile("./package.json", { encoding: "utf-8" }));

await writeFile('./src/version.js', `// This file get's auto-updated on each release. Please don't edit it manually.
export const VERSION = '${pkg.version}';
`)
