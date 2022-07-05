import { test } from 'uvu';
import { create } from '../index.js';
import fs, { rmSync } from 'fs';
import { execSync } from 'child_process';

const dir = '.test-tmp';

test.after(() => {
	rmSync(dir, { recursive: true, force: true });
});

for (const template of fs.readdirSync('templates')) {
	test(`${template}: JSDoc`, () => {
		const cwd = `${dir}/${template}-JSDoc`;
		rmSync(cwd, { recursive: true, force: true });

		create(cwd, {
			name: 'test',
			template,
			types: 'checkjs',
			prettier: false,
			eslint: false,
			playwright: false
		});

		execSync('npm i', { cwd, stdio: 'inherit' });
		execSync('npm run check', { cwd, stdio: 'inherit' });
	});

	test(`${template}: TS`, () => {
		const cwd = `${dir}/${template}-TS`;
		rmSync(cwd, { recursive: true, force: true });

		create(cwd, {
			name: 'test',
			template,
			types: 'typescript',
			prettier: false,
			eslint: false,
			playwright: false
		});

		execSync('npm i', { cwd, stdio: 'inherit' });
		execSync('npm run check', { cwd, stdio: 'inherit' });
	});
}

test.run();
