import path from 'path';
import glob from 'tiny-glob/sync.js';
import { fileURLToPath } from 'url';
import { runner } from '../../../runner.js'; // TODO make this a package?

runner(
	async () => {
		const __filename = fileURLToPath(import.meta.url);
		const cwd = path.join(__filename, '../../src/routes');
		const modules = glob('**/__tests__.js', { cwd });

		const tests = [];

		for (const file of modules) {
			console.log(file);
			const mod = await import(`${cwd}/${file}`);
			tests.push(mod.default);
		}

		return tests;
	},
	{
		amp: true
	}
);
