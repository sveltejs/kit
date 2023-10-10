import { assert, test } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { EOL } from 'node:os';

test('prerenderable routes must be prerendered', () => {
	assert.throws(
		() =>
			execSync('pnpm build', {
				cwd: path.join(process.cwd(), 'apps/prerenderable-not-prerendered'),
				stdio: 'pipe',
				timeout: 60000
			}),
		/The following routes were marked as prerenderable, but were not prerendered because they were not found while crawling your app:\r?\n {2}- \/\[x\]/gs
	);
});

test('entry generators should match their own route', () => {
	assert.throws(
		() =>
			execSync('pnpm build', {
				cwd: path.join(process.cwd(), 'apps/prerender-entry-generator-mismatch'),
				stdio: 'pipe',
				timeout: 60000
			}),
		`Error: The entries export from /[slug]/[notSpecific] generated entry /whatever/specific, which was matched by /[slug]/specific - see the \`handleEntryGeneratorMismatch\` option in https://kit.svelte.dev/docs/configuration#prerender for more info.${EOL}To suppress or handle this error, implement \`handleEntryGeneratorMismatch\` in https://kit.svelte.dev/docs/configuration#prerender`
	);
});
