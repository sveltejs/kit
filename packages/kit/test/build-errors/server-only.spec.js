import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { execSync } from 'node:child_process';
import path from 'node:path';

test('$lib/*.server.* is not statically importable from the client', () => {
	assert.throws(
		() =>
			execSync('pnpm build', {
				cwd: path.join(process.cwd(), 'apps/server-only-module'),
				stdio: 'pipe',
				timeout: 15000
			}),
		/.*Cannot import \$lib\/test.server.js into public-facing code:.*/gs
	);
});

test('$lib/*.server.* is not dynamically importable from the client', () => {
	assert.throws(
		() =>
			execSync('pnpm build', {
				cwd: path.join(process.cwd(), 'apps/server-only-module-dynamic-import'),
				stdio: 'pipe',
				timeout: 15000
			}),
		/.*Cannot import \$lib\/test.server.js into public-facing code:.*/gs
	);
});

test('$lib/server/* is not statically importable from the client', () => {
	assert.throws(
		() =>
			execSync('pnpm build', {
				cwd: path.join(process.cwd(), 'apps/server-only-folder'),
				stdio: 'pipe',
				timeout: 15000
			}),
		/.*Cannot import \$lib\/server\/something\/test.js into public-facing code:.*/gs
	);
});

test('$lib/server/* is not dynamically importable from the client', () => {
	assert.throws(
		() =>
			execSync('pnpm build', {
				cwd: path.join(process.cwd(), 'apps/server-only-folder-dynamic-import'),
				stdio: 'pipe',
				timeout: 15000
			}),
		/.*Cannot import \$lib\/server\/something\/test.js into public-facing code:.*/gs
	);
});

test.run();
