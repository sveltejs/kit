import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { isBuiltin } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { parseAst } from 'vite';

/**
 * Copies the test app in `dir` with `pnpm deploy`, so that kit and the adapter are installed
 * packages rather than workspace links and Vite resolves them the way it would in a user's project
 * @param {string} dir the app's directory in the workspace
 * @returns {string} the copy, which the caller removes
 */
export function deploy(dir) {
	const app = location(dir);
	fs.rmSync(app, { recursive: true, force: true });
	execFileSync('pnpm', ['--filter', name(dir), 'deploy', app], {
		cwd: dir,
		stdio: 'inherit',
		shell: process.platform === 'win32'
	});

	return app;
}

/**
 * Where `deploy` puts the copy of the app in `dir`
 * @param {string} dir
 */
export function location(dir) {
	const hash = createHash('sha1').update(dir).digest('hex').slice(0, 8);
	return path.join(os.tmpdir(), `${name(dir)}-${hash}`);
}

/** @param {string} dir */
function name(dir) {
	return JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).name;
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
