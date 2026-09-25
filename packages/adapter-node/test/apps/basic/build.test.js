import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { isBuiltin } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { parseAst } from 'vite';
import { afterAll, afterEach, beforeAll, expect, test, vi } from 'vitest';

const pkg = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, 'package.json'), 'utf8'));

// the app is built from a `pnpm deploy` copy, where kit and the adapter are installed
// packages rather than workspace links, so Vite resolves them the way it would in a user's project
const app = fs.mkdtempSync(path.join(os.tmpdir(), `${pkg.name}-`));
const build = path.join(app, 'build');

beforeAll(() => {
	execFileSync('pnpm', ['--filter', pkg.name, 'deploy', app], {
		cwd: import.meta.dirname,
		stdio: 'inherit',
		shell: process.platform === 'win32'
	});
	execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
		cwd: app,
		env: { ...process.env, MY_CUSTOM_PORT: '5173', INSTRUMENTATION_ENV: 'available' },
		stdio: 'inherit'
	});
}, 60_000);

afterAll(() => fs.rmSync(app, { recursive: true, force: true }));
afterEach(() => vi.unstubAllEnvs());

function* output_files() {
	for (const file of fs.readdirSync(build, { encoding: 'utf8', recursive: true })) {
		if (file.endsWith('.js')) yield fs.readFileSync(path.join(build, file), 'utf8');
	}
}

/** static, re-exported and dynamic import specifiers found under `node` */
function* imports(node) {
	if (!node || typeof node !== 'object') return;

	if (Array.isArray(node)) {
		for (const child of node) yield* imports(child);
		return;
	}

	if (typeof node.source?.value === 'string') yield node.source.value;

	for (const key in node) {
		if (key !== 'source') yield* imports(node[key]);
	}
}

test('exports the handler', async () => {
	vi.stubEnv('MY_CUSTOM_PORT', '5173');
	vi.stubEnv('INSTRUMENTATION_ENV', 'available');
	const { handler } = await import(path.join(build, 'handler.js'));
	expect(handler).toBeDefined();
});

test('dependencies are not bundled', () => {
	const marker = 'server-side-dep implementation';

	for (const code of output_files()) {
		expect(code).not.toContain(marker);
	}
});

test('everything else is bundled', () => {
	const dependencies = Object.keys(pkg.dependencies);

	for (const code of output_files()) {
		for (const specifier of imports(parseAst(code))) {
			if (specifier.startsWith('.')) continue;

			const external =
				isBuiltin(specifier) ||
				dependencies.some((d) => specifier === d || specifier.startsWith(`${d}/`));
			expect(external, `${specifier} should have been bundled`).toBe(true);
		}
	}
});
