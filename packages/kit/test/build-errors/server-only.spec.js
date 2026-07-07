import { assert, test } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const timeout = 60_000;

// ordinarily server-only modules are allowed during testing, since Vitest can't differentiate
/** @type {Record<string, any>} */
const env = { ...process.env, TEST: false };

test('$lib/*.server.* is not statically importable from the client', { timeout }, () => {
	assert.throws(
		() =>
			execSync('pnpm build', {
				cwd: path.join(import.meta.dirname, 'apps/server-only-module'),
				stdio: 'pipe',
				timeout,
				env
			}),
		/.*Cannot import \$lib\/test.server.js into code that runs in the browser.*/gs
	);
});

test('$lib/*.server.* is not dynamically importable from the client', { timeout }, () => {
	assert.throws(
		() =>
			execSync('pnpm build', {
				cwd: path.join(import.meta.dirname, 'apps/server-only-module-dynamic-import'),
				stdio: 'pipe',
				timeout,
				env
			}),
		/.*Cannot import \$lib\/test.server.js into code that runs in the browser.*/gs
	);
});

test('$lib/**/server/* is not statically importable from the client', { timeout }, () => {
	assert.throws(
		() =>
			execSync('pnpm build', {
				cwd: path.join(import.meta.dirname, 'apps/server-only-folder'),
				stdio: 'pipe',
				timeout,
				env
			}),
		/.*Cannot import \$lib\/blah\/server\/something\/private.js into code that runs in the browser.*/gs
	);
});

test('$lib/**/server/* is not dynamically importable from the client', { timeout }, () => {
	assert.throws(
		() =>
			execSync('pnpm build', {
				cwd: path.join(import.meta.dirname, 'apps/server-only-folder-dynamic-import'),
				stdio: 'pipe',
				timeout,
				env
			}),
		/.*Cannot import \$lib\/blah\/server\/something\/private.js into code that runs in the browser.*/gs
	);
});

test(
	'*.server.* in node_modules is importable from the client when the package does not depend on @sveltejs/kit',
	{ timeout },
	() => {
		// Should not throw — the build should succeed because the package is not a SvelteKit package
		execSync('pnpm build', {
			cwd: path.join(import.meta.dirname, 'apps/server-only-module-in-node-modules-no-kit'),
			stdio: 'pipe',
			timeout,
			env
		});
	}
);

test(
	'*.server.* in node_modules is not importable from the client when the package depends on @sveltejs/kit',
	{ timeout },
	() => {
		assert.throws(
			() =>
				execSync('pnpm build', {
					cwd: path.join(import.meta.dirname, 'apps/server-only-module-in-node-modules-with-kit'),
					stdio: 'pipe',
					timeout,
					env
				}),
			/.*Cannot import.*index\.server\.js into code that runs in the browser.*/gs
		);
	}
);
