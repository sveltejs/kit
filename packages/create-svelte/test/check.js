import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { test } from 'uvu';
import { create } from '../index.js';

// use a directory outside of packages to ensure it isn't added to the pnpm workspace
const dir = '../../.test-tmp/create-svelte/';

test.before(() => {
	fs.rmSync(dir, { recursive: true, force: true });
});

for (const template of fs.readdirSync('templates')) {
	for (const types of ['checkjs', 'typescript']) {
		test(`${template}: ${types}`, () => {
			const cwd = `${dir}/${template}-${types}`;
			fs.rmSync(cwd, { recursive: true, force: true });

			create(cwd, {
				name: `create-svelte-test-${template}-${types}`,
				template,
				types,
				prettier: false,
				eslint: false,
				playwright: false
			});
			const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf-8'));
			pkg.devDependencies['@sveltejs/kit'] = 'file:../../../packages/kit';
			if (pkg.devDependencies['@sveltejs/adapter-auto']) {
				pkg.devDependencies['@sveltejs/adapter-auto'] = 'file:../../../packages/adapter-auto';
			}
			fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify(pkg, null, '\t'));
			// explicitly only install in the dir under test to avoid running a pnpm workspace command
			execSync('pnpm install .', { cwd, stdio: 'inherit' });
		});
	}
}

test.run();
