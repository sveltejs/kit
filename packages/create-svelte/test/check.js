import fs from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { create } from '../index.js';
import { fileURLToPath } from 'node:url';
import glob from 'tiny-glob';
// use a directory outside of packages to ensure it isn't added to the pnpm workspace
const test_workspace_dir = fileURLToPath(
	new URL('../../../.test-tmp/create-svelte/', import.meta.url)
);

const existing_workspace_overrides = JSON.parse(
	fs.readFileSync(fileURLToPath(new URL('../../../package.json', import.meta.url)), 'utf-8')
).pnpm?.overrides;

const overrides = { ...existing_workspace_overrides };

(
	await glob(fileURLToPath(new URL('../../../packages', import.meta.url)) + '/*/package.json')
).forEach((pkgPath) => {
	const name = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')).name;
	// use `file:` protocol for opting into stricter resolve logic which catches more bugs,
	// but only on CI because it doesn't work locally for some reason
	const protocol = process.env.CI ? 'file:' : '';
	overrides[name] = `${protocol}${path.dirname(path.resolve(pkgPath))}`;
});

try {
	const kit_dir = fileURLToPath(new URL('../../../packages/kit', import.meta.url));
	const ls_vite_result = execSync(`pnpm ls --json vite`, { cwd: kit_dir });
	const vite_version = JSON.parse(ls_vite_result)[0].devDependencies.vite.version;
	overrides.vite = vite_version;
} catch (e) {
	console.error('failed to parse installed vite version from packages/kit');
	throw e;
}

test.before(() => {
	try {
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

		// force creation of pnpm-lock.yaml in test workspace
		console.log(`running pnpm install in .test-tmp/create-svelte`);
		execSync('pnpm install --no-frozen-lockfile', { dir: test_workspace_dir, stdio: 'ignore' });
	} catch (e) {
		console.error('failed to setup create-svelte test workspace', e);
		throw e;
	}
});

for (const template of fs.readdirSync('templates')) {
	if (template[0] === '.') continue;

	for (const types of ['checkjs', 'typescript']) {
		test(`${template}: ${types}`, () => {
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

			// this pnpm install works in the test workspace, which redirects to our local packages again
			console.log(`running pnpm install in ${cwd}`);
			execSync('pnpm install --no-frozen-lockfile', { cwd, stdio: 'ignore' });

			// run provided scripts that are non-blocking. All of them should exit with 0
			const scripts_to_test = ['sync', 'format', 'lint', 'check', 'build'];

			// package script requires lib dir
			if (fs.existsSync(path.join(cwd, 'src', 'lib'))) {
				scripts_to_test.push('package');
			}

			// not all templates have all scripts
			console.group(`${template}-${types}`);
			for (const script of scripts_to_test.filter((s) => !!pkg.scripts[s])) {
				try {
					execSync(`pnpm ${script}`, { cwd, stdio: 'pipe' });
					console.log(`✅ ${script}`);
				} catch (e) {
					console.error(`❌ ${script}`);
					console.error(`---\nstdout:\n${e.stdout}`);
					console.error(`---\nstderr:\n${e.stderr}`);
					console.groupEnd();
					assert.unreachable(e.message);
				}
			}
			console.groupEnd();
		});
	}
}

test.run();
