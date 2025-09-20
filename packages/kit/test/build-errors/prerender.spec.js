import path from 'node:path';
import { execSync } from 'node:child_process';
import { EOL } from 'node:os';
import { fileURLToPath } from 'node:url';
import { assert, test } from 'vitest';

const timeout = 60_000;

const dir = path.dirname(fileURLToPath(import.meta.url));

test('prerenderable routes must be prerendered', { timeout }, () => {
	assert.throws(
		() =>
			execSync('pnpm build', {
				cwd: path.join(dir, 'apps/prerenderable-not-prerendered'),
				stdio: 'pipe',
				timeout
			}),
		/The following routes were marked as prerenderable, but were not prerendered because they were not found while crawling your app:\r?\n {2}- \/\[x\]/gs
	);
});

test('entry generators should match their own route', { timeout }, () => {
	assert.throws(
		() =>
			execSync('pnpm build', {
				cwd: path.join(dir, 'apps/prerender-entry-generator-mismatch'),
				stdio: 'pipe',
				timeout
			}),
		`Error: The entries export from /[slug]/[notSpecific] generated entry /whatever/specific, which was matched by /[slug]/specific - see the \`handleEntryGeneratorMismatch\` option in https://svelte.dev/docs/kit/configuration#prerender for more info.${EOL}To suppress or handle this error, implement \`handleEntryGeneratorMismatch\` in https://svelte.dev/docs/kit/configuration#prerender`
	);
});

test('an error in a `prerender` function should fail the build', { timeout }, () => {
	assert.throws(
		() =>
			execSync('pnpm build', {
				cwd: path.join(dir, 'apps/prerender-remote-function-error'),
				stdio: 'pipe',
				timeout
			}),
		/remote function blew up/
	);
});
