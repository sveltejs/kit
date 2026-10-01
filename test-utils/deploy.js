import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { isBuiltin } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { parseAst } from 'vite';
import { afterAll, beforeAll } from 'vitest';

/**
 * Deploys and builds the test app in `dir` before the tests in the current file and removes the
 * copy afterwards. In the copy, kit and the adapter are installed packages rather than workspace
 * links, so Vite resolves them the way it would in a user's project
 * @param {string} dir the app's directory in the workspace
 * @param {Record<string, string>} [env]
 * @returns {string} the copy
 */
export function deploy(dir, env) {
	const { name } = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
	const app = path.join(os.tmpdir(), name);

	beforeAll(() => {
		fs.rmSync(app, { recursive: true, force: true });
		execFileSync('pnpm', ['--filter', name, 'deploy', app], {
			cwd: dir,
			stdio: 'inherit',
			shell: process.platform === 'win32'
		});
		build(app, env);
	}, 60_000);

	afterAll(() => fs.rmSync(app, { recursive: true, force: true }));

	return app;
}

/**
 * @param {string} app a copy returned by `deploy`
 * @param {Record<string, string>} [env]
 */
export function build(app, env = {}) {
	// `pnpm build` would first reinstall the copy, which never passes pnpm's verifyDepsBeforeRun check
	execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
		cwd: app,
		env: { ...process.env, ...env },
		stdio: 'inherit'
	});
}

/**
 * Bare specifiers imported by the `.js` files under `output` that a production install of the
 * app could not resolve, i.e. neither Node builtins nor the app's `dependencies`
 * @param {string} app a copy returned by `deploy`
 * @param {string} output a directory of built files, relative to `app`
 * @returns {string[]}
 */
export function leaked_imports(app, output) {
	const pkg = JSON.parse(fs.readFileSync(path.join(app, 'package.json'), 'utf8'));
	const dependencies = Object.keys(pkg.dependencies ?? {});
	const dir = path.join(app, output);
	const leaked = new Set();
	for (const file of fs.readdirSync(dir, { encoding: 'utf8', recursive: true })) {
		if (!/\.m?js$/.test(file)) continue;
		for (const specifier of imports(parseAst(fs.readFileSync(path.join(dir, file), 'utf8')))) {
			if (specifier.startsWith('.') || isBuiltin(specifier)) continue;
			if (dependencies.some((d) => specifier === d || specifier.startsWith(`${d}/`))) continue;
			leaked.add(specifier);
		}
	}
	return [...leaked];
}

/**
 * static, re-exported and dynamic import specifiers found under `node`
 * @param {any} node
 * @returns {Generator<string>}
 */
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
