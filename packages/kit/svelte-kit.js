#!/usr/bin/env node
import fs from 'fs';
import { fileURLToPath } from 'url';

// in our own CI, and when deploying directly from this monorepo,
// the `dist` directory will not exist yet
if (fs.existsSync(fileURLToPath(new URL('./dist', import.meta.url)))) {
	import('./dist/cli.js');
} else {
	console.error('Run "pnpm build" and try running this command again');
}
