import fs from 'fs';
import { execSync } from 'child_process';
import { test } from 'uvu';
import { create } from '../index.js';

const dir = '.test-tmp';

test.after(() => {
	fs.rmSync(dir, { recursive: true, force: true });
});

for (const template of fs.readdirSync('templates')) {
	for (const types of ['checkjs', 'typescript']) {
		test(`${template}: ${types}`, () => {
			const cwd = `${dir}/${template}-${types}`;
			fs.rmSync(cwd, { recursive: true, force: true });

			create(cwd, {
				name: 'test',
				template,
				types,
				prettier: false,
				eslint: false,
				playwright: false
			});

			execSync('npm i && npm run check', { cwd, stdio: 'inherit' });
		});
	}
}

test.run();
