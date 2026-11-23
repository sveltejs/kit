import { execSync } from 'node:child_process';
import path from 'node:path';
import { test } from 'vitest';
import { timeout } from './utils.js';

// https://github.com/sveltejs/kit/issues/17433
test('a dependency the app resolves to another version is bundled', { timeout }, () => {
	execSync('pnpm build', {
		cwd: path.join(import.meta.dirname, 'apps/mismatched-dependency'),
		stdio: 'pipe',
		timeout
	});
});
