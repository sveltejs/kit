import path from 'path';
import glob from 'tiny-glob/sync.js';
import * as assert from 'uvu/assert';
import { fileURLToPath } from 'url';
import { runner } from '../../../runner.js'; // TODO make this a package?

runner(
	async () => {
		const __filename = fileURLToPath(import.meta.url);
		const cwd = path.join(__filename, '../../source/pages');
		const modules = glob('**/__tests__.js', { cwd });

		const tests = [];

		for (const file of modules) {
			const mod = await import(`${cwd}/${file}`);
			tests.push(mod.default);
		}

		tests.push((suite, is_dev) => {
			suite('serves /', async ({ visit, contains, js }) => {
				await visit('/');
				assert.ok(await contains('I am in the template'), 'Should show custom template contents');
				assert.ok(await contains("We're on index.svelte"), 'Should show page contents');
				assert.ok(
					await contains(
						`Hello from the ${js ? 'client' : 'server'} in ${is_dev ? 'dev' : 'prod'} mode!`
					),
					'Should run JavaScript'
				);
			});
		});

		return tests;
	}
);
