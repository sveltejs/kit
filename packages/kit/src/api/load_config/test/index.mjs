import { join } from 'path';
import * as uvu from 'uvu';
import * as assert from 'uvu/assert';
import { fileURLToPath } from 'url';
import { load_config } from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

const suite = uvu.suite('Builder');

suite('load default config', async () => {
	const config = await load_config({
		cwd: join(__dirname, 'fixtures')
	});

	assert.equal(config, {
		compilerOptions: null,
		extensions: ['.svelte'],
		kit: {
			adapter: [null],
			amp: false,
			appDir: '_app',
			files: {
				assets: 'static',
				routes: 'src/routes',
				setup: 'src/setup',
				template: 'src/app.html'
			},
			host: null,
			hostHeader: null,
			paths: { base: '', assets: '/.' },
			prerender: { crawl: true, enabled: true, force: false, pages: ['*'] },
			startGlobal: null,
			target: null
		},
		preprocess: null
	});
});

suite.run();
