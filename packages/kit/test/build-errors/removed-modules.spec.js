import { assert, test } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';

const timeout = 60_000;

test('an unresolved $lib import explains how to migrate', { timeout }, () => {
	try {
		execSync('pnpm build', {
			cwd: path.join(import.meta.dirname, 'apps/removed-lib-import'),
			stdio: 'pipe',
			timeout
		});
	} catch (err) {
		const message = /** @type {Error} */ (err).message;
		assert.ok(
			message.includes('module_removed_lib\n`$lib` has been removed. Use `#lib` instead'),
			`received unexpected exception message ${message}`
		);
		return;
	}
	throw new Error();
});

test('an unresolved $service-worker import explains how to migrate', { timeout }, () => {
	try {
		execSync('pnpm build', {
			cwd: path.join(import.meta.dirname, 'apps/removed-service-worker-import'),
			stdio: 'pipe',
			timeout
		});
	} catch (err) {
		const message = /** @type {Error} */ (err).message;
		assert.ok(
			message.includes(
				'module_removed_service_worker\n`$service-worker` has been removed. Use `immutable`, `assets` and `prerendered` from `$app/manifest`'
			),
			`received unexpected exception message ${message}`
		);
		return;
	}
	throw new Error();
});
