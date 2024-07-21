import { assert, test } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';

test('$lib/*.server.* is not statically importable from the client', () => {
	try {
		execSync('pnpm build', {
			cwd: path.join(process.cwd(), 'apps/server-only-module'),
			stdio: 'pipe',
			timeout: 60000
		});
	} catch (err) {
		assert.ok(
			err.message.includes('Cannot import $lib/test.server.js into client-side code'),
			`received unexpected exception message ${err.message}`
		);
		return;
	}
	throw new Error();
});

test('$lib/*.server.* is not dynamically importable from the client', () => {
	try {
		execSync('pnpm build', {
			cwd: path.join(process.cwd(), 'apps/server-only-module-dynamic-import'),
			stdio: 'pipe',
			timeout: 60000
		});
	} catch (err) {
		assert.ok(
			err.message.includes('Cannot import $lib/test.server.js into client-side code'),
			`received unexpected exception message ${err.message}`
		);
		return;
	}
	throw new Error();
});

test('$lib/server/* is not statically importable from the client', () => {
	try {
		execSync('pnpm build', {
			cwd: path.join(process.cwd(), 'apps/server-only-folder'),
			stdio: 'pipe',
			timeout: 60000
		});
	} catch (err) {
		assert.ok(
			err.message.includes('Cannot import $lib/server/something/private.js into client-side code'),
			`received unexpected exception message ${err.message}`
		);
		return;
	}
	throw new Error();
});

test('$lib/server/* is not dynamically importable from the client', () => {
	try {
		execSync('pnpm build', {
			cwd: path.join(process.cwd(), 'apps/server-only-folder-dynamic-import'),
			stdio: 'pipe',
			timeout: 60000
		});
	} catch (err) {
		assert.ok(
			err.message.includes('Cannot import $lib/server/something/private.js into client-side code'),
			`received unexpected exception message ${err.message}`
		);
		return;
	}
	throw new Error();
});

test('serverOnlyPaths string is not importable from the client', () => {
	try {
		execSync('pnpm build', {
			cwd: path.join(process.cwd(), 'apps/server-only-module-config-string'),
			stdio: 'pipe',
			timeout: 60000
		});
	} catch (err) {
		assert.ok(
			err.message.includes('Cannot import src/private-boom/test.server.js into client-side code'),
			`received unexpected exception message ${err.message}`
		);
		return;
	}
	throw new Error();
});

test('serverOnlyPaths RegExp is not importable from the client', () => {
	try {
		execSync('pnpm build', {
			cwd: path.join(process.cwd(), 'apps/server-only-module-config-regexp'),
			stdio: 'pipe',
			timeout: 60000
		});
	} catch (err) {
		assert.ok(
			err.message.includes('Cannot import src/private-boom/test.server.js into client-side code'),
			`received unexpected exception message ${err.message}`
		);
		return;
	}
	throw new Error();
});

test('serverOnlyPaths function is not importable from the client', () => {
	try {
		execSync('pnpm build', {
			cwd: path.join(process.cwd(), 'apps/server-only-module-config-function'),
			stdio: 'pipe',
			timeout: 60000
		});
	} catch (err) {
		assert.ok(
			err.message.includes('Cannot import src/private-boom/test.server.js into client-side code'),
			`received unexpected exception message ${err.message}`
		);
		return;
	}
	throw new Error();
});
