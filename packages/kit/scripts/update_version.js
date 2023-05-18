import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const pathToPackageJson = resolve(__dirname, '..', 'package.json')
const pathToVersionModule = resolve(__dirname, '..', 'src', 'version.js')

const pkg = JSON.parse(await readFile(pathToPackageJson, { encoding: 'utf-8' }));

await writeFile(
	pathToVersionModule,
	`// This file get's auto-updated on each release. Please don't edit it manually.
export const VERSION = '${pkg.version}';
`)
