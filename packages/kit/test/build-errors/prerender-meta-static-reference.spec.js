import { assert, test } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const timeout = 60_000;

test('should handle HTTP errors in meta tags without infinite loop', { timeout }, () => {
	// This should complete successfully without timing out or causing memory errors
	const result = execSync('pnpm build', {
		cwd: path.join(process.cwd(), 'apps/prerender-meta-static-reference'),
		stdio: 'pipe',
		timeout,
		encoding: 'utf8'
	});
	
	// The build should succeed and warn about favicon.png but not about malformed URLs
	assert.match(result, /404.*favicon\.png/);
	assert.ok(!result.includes('sveltekit-prerender//image'), 'Should not contain malformed URLs with double slashes');
});