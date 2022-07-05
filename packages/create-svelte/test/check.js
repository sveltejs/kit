import { test } from 'uvu';
import { create } from '../index.js';
import fs, { rmSync } from 'fs';
import { execSync } from 'child_process';

const dir = '.test-tmp';

test.after(() => {
	rmSync(dir, { recursive: true, force: true });
});

for (const template of fs.readdirSync('templates')) {
	for (const types of ['checkjs', 'typescript']) {
		test(`${template}: JSDoc`, () => {
			const cwd = `${dir}/${template}-${types}`;
			rmSync(cwd, { recursive: true, force: true });

			create(cwd, {
				name: 'test',
				template,
				types,
				prettier: false,
				eslint: false,
				playwright: false
			});

			execSync('npm i', { cwd, stdio: 'inherit' });
			execSync('npm run check', { cwd, stdio: 'inherit' });
		});
	}
}

test.run();
