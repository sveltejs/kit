import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));

fs.writeFileSync(
	'src/version.js',
	`// This file is auto-updated on each release. Please don't edit it manually.
export const VERSION = '${pkg.version}';
`
);
