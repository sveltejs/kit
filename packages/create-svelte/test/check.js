import fs from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { create } from '../index.js';
import { fileURLToPath } from 'node:url';
import glob from 'tiny-glob';

/** Resolve the given path relative to the current file */
const resolve_path = (path) => fileURLToPath(new URL(path, import.meta.url));

// use a directory outside of packages to ensure it isn't added to the pnpm workspace
const test_workspace_dir = resolve_path('../../../.test-tmp/create-svelte/');

const existing_workspace_overrides = JSON.parse(
	fs.readFileSync(resolve_path('../../../package.json'), 'utf-8')
).pnpm?.overrides;

const overrides = { ...existing_workspace_overrides };

(await glob(resolve_path('../../../packages') + '/*/package.json')).forEach((pkgPath) => {
	const name = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')).name;
	// use `file:` protocol for opting into stricter resolve logic which catches more bugs,
	// but only on CI because it doesn't work locally for some reason
	const protocol = process.env.CI ? 'file:' : '';
	overrides[name] = `${protocol}${path.dirname(path.resolve(pkgPath))}`;
});

try {
	const kit_dir = resolve_path('../../../packages/kit');
	const ls_vite_result = execSync(`pnpm ls --json vite`, { cwd: kit_dir });
	const vite_version = JSON.parse(ls_vite_result)[0].devDependencies.vite.version;
	overrides.vite = vite_version;
} catch (e) {
	console.error('failed to parse installed vite version from packages/kit');
	throw e;
}

// prepare test pnpm workspace
fs.rmSync(test_workspace_dir, { recursive: true, force: true });
fs.mkdirSync(test_workspace_dir, { recursive: true });
const workspace = {
	name: 'svelte-check-test-fake-pnpm-workspace',
	private: true,
	version: '0.0.0',
	pnpm: { overrides },
	devDependencies: overrides
};
fs.writeFileSync(
	path.join(test_workspace_dir, 'package.json'),
	JSON.stringify(workspace, null, '\t')
);
fs.writeFileSync(path.join(test_workspace_dir, 'pnpm-workspace.yaml'), 'packages:\n  - ./*\n');

for (const template of fs.readdirSync('templates')) {
	if (template[0] === '.') continue;

	for (const types of ['checkjs', 'typescript']) {
		const cwd = path.join(test_workspace_dir, `${template}-${types}`);
		fs.rmSync(cwd, { recursive: true, force: true });

		create(cwd, {
			name: `create-svelte-test-${template}-${types}`,
			template,
			types,
			prettier: true,
			eslint: true,
			playwright: false
		});
		const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf-8'));
		Object.entries(overrides).forEach(([key, value]) => {
			if (pkg.devDependencies?.[key]) {
				pkg.devDependencies[key] = value;
			}
			if (pkg.dependencies?.[key]) {
				pkg.dependencies[key] = value;
			}
			if (!pkg.pnpm) {
				pkg.pnpm = {};
			}
			if (!pkg.pnpm.overrides) {
				pkg.pnpm.overrides = {};
			}
			pkg.pnpm.overrides = { ...pkg.pnpm.overrides, ...overrides };
		});
		pkg.private = true;
		fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify(pkg, null, '\t') + '\n');

		// run provided scripts that are non-blocking. All of them should exit with 0
		// package script requires lib dir
		const scripts_to_test = ['sync', 'format', 'lint', 'check', 'build'];
		if (fs.existsSync(path.join(cwd, 'src', 'lib'))) {
			scripts_to_test.push('package');
		}

		for (const script of scripts_to_test.filter((s) => !!pkg.scripts[s])) {
			test(`${template}-${types}: ${script}`, () => {
				try {
					execSync(`pnpm ${script}`, { cwd, stdio: 'pipe' });
				} catch (e) {
					assert.unreachable(
						`script: ${script} failed\n` +
							`---\nstdout:\n${e.stdout}\n` +
							`---\nstderr:\n${e.stderr}`
					);
				}
			});
		}
	}
}

console.log('installing dependencies...');
execSync('pnpm install --no-frozen-lockfile', { cwd: test_workspace_dir, stdio: 'ignore' });
console.log('done installing dependencies');
test.run();
