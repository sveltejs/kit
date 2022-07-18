import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { create } from '../index.js';
import { fileURLToPath } from 'url';
// use a directory outside of packages to ensure it isn't added to the pnpm workspace
const test_workspace_dir = fileURLToPath(
	new URL('../../../.test-tmp/create-svelte/', import.meta.url)
);
const overrides = {};
['kit', 'adapter-auto', 'adapter-cloudflare', 'adapter-netlify', 'adapter-vercel'].forEach(
	(pkg) => {
		overrides[`@sveltejs/${pkg}`] = `${path.resolve(
			test_workspace_dir,
			'..',
			'..',
			'packages',
			pkg
		)}`; //'workspace:*';
	}
);
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
		execSync('pnpm install --no-frozen-lockfile', { dir: test_workspace_dir, stdio: 'inherit' });
	} catch (e) {
		console.error('failed to setup create-svelte test workspace', e);
		throw e;
	}
});

for (const template of fs.readdirSync('templates')) {
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
			});
			pkg.private = true;
			fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify(pkg, null, '\t') + '\n');

			// this pnpm install works in the test workspace, which redirects to our local packages again
			execSync('pnpm install --no-frozen-lockfile', { cwd, stdio: 'inherit' });

			// run provided scripts that are non-blocking. All of them should exit with 0
			const scripts_to_test = ['prepare', 'check', 'lint', 'build', 'sync'];

			// package script requires lib dir
			if (fs.existsSync(path.join(cwd, 'src', 'lib'))) {
				scripts_to_test.push('package');
			}

			// not all templates have all scripts
			for (const script of Object.keys(pkg.scripts).filter((s) => scripts_to_test.includes(s))) {
				const command = `pnpm run ${script}`;
				try {
					console.log(`executing ${command} in ${cwd}`);
					execSync(command, { cwd, stdio: 'inherit' });
				} catch (e) {
					const msg = `${command} failed in ${cwd}`;
					console.error(msg, e);
					assert.unreachable(msg);
				}
			}
		});
	}
}

test.run();
