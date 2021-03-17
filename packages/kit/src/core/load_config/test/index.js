import { join } from 'path';
import * as uvu from 'uvu';
import * as assert from 'uvu/assert';
import { fileURLToPath } from 'url';
import { load_config } from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

const suite = uvu.suite('Builder');

suite('load default config', async () => {
	const cwd = join(__dirname, 'fixtures');

	const config = await load_config({ cwd });

	assert.equal(config, {
		compilerOptions: null,
		extensions: ['.svelte'],
		kit: {
			adapter: [null],
			amp: false,
			appDir: '_app',
			files: {
				assets: join(cwd, 'static'),
				lib: join(cwd, 'src/lib'),
				routes: join(cwd, 'src/routes'),
				serviceWorker: join(cwd, 'src/service-worker'),
				setup: join(cwd, 'src/setup'),
				template: join(cwd, 'src/app.html')
			},
			host: null,
			hostHeader: null,
			paths: { base: '', assets: '/.' },
			prerender: { crawl: true, enabled: true, force: false, pages: ['*'] },
			target: null
		},
		preprocess: null
	});
});

suite.run();
