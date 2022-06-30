import { test } from 'uvu';
import { create } from '../index.js';
import fs, { rmSync } from 'fs';
import { build_templates } from '../scripts/build-templates.js';
import { execSync } from 'child_process';

await build_templates();

const templates = fs.readdirSync('templates');
const testRootDir = '.test-tmp';

test.after(() => {
	rmSync(testRootDir, { recursive: true, force: true });
});

for (const template of templates) {
	test(`${template}: JSDoc`, () => {
		const testDir = `${testRootDir}/${template}-JSDoc`;
		rmSync(testDir, { recursive: true, force: true });
		create(testDir, {
			name: 'test',
			template,
			types: 'checkjs',
			prettier: false,
			eslint: false,
			playwright: false
		});
		execSync('npm i', { cwd: testDir });
		try {
			execSync('npm run check', { cwd: testDir });
		} catch (e) {
			console.error(e.stdout.toString());
			throw e;
		}
	});
	test(`${template}: TS`, () => {
		const testDir = `${testRootDir}/${template}-TS`;
		rmSync(testDir, { recursive: true, force: true });
		create(testDir, {
			name: 'test',
			template,
			types: 'typescript',
			prettier: false,
			eslint: false,
			playwright: false
		});
		execSync('npm i', { cwd: testDir });
		try {
			execSync('npm run check', { cwd: testDir });
		} catch (e) {
			console.error(e.stdout.toString());
			throw e;
		}
	});
}

test.run();
