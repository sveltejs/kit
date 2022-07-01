import fs from 'fs';
import colors from 'kleur';
import sade from 'sade';
import { load_config } from './core/config/index.js';
import { coalesce_to_error } from './utils/error.js';

/** @param {unknown} e */
function handle_error(e) {
	const error = coalesce_to_error(e);

	if (error.name === 'SyntaxError') throw error;

	console.error(colors.bold().red(`> ${error.message}`));
	if (error.stack) {
		console.error(colors.gray(error.stack.split('\n').slice(1).join('\n')));
	}

	process.exit(1);
}

const prog = sade('svelte-kit').version('__VERSION__');

prog
	.command('dev')
	.describe('Start a development server')
	.option('-p, --port', 'Port')
	.option('-o, --open', 'Open a browser tab')
	.option('--host', 'Host (only use this on trusted networks)')
	.option('--https', 'Use self-signed HTTPS certificate')
	.option('-H', 'no longer supported, use --https instead') // TODO remove for 1.0
	.action(async () => {
		console.error('Please use the vite command rather than the svelte-kit command');
	});

prog
	.command('build')
	.describe('Create a production build of your app')
	.option('--verbose', 'Log more stuff', false)
	.action(async () => {
		console.error('Please use the vite command rather than the svelte-kit command');
	});

prog
	.command('preview')
	.describe('Serve an already-built app')
	.option('-p, --port', 'Port', 3000)
	.option('-o, --open', 'Open a browser tab', false)
	.option('--host', 'Host (only use this on trusted networks)', 'localhost')
	.option('--https', 'Use self-signed HTTPS certificate', false)
	.option('-H', 'no longer supported, use --https instead') // TODO remove for 1.0
	.action(async () => {
		console.error('Please use the vite command rather than the svelte-kit command');
	});

prog
	.command('package')
	.describe('Create a package')
	.option('-w, --watch', 'Rerun when files change', false)
	.action(async ({ watch }) => {
		try {
			const config = await load_config();
			const packaging = await import('./packaging/index.js');

			await (watch ? packaging.watch(config) : packaging.build(config));
		} catch (error) {
			handle_error(error);
		}
	});

prog
	.command('sync')
	.describe('Synchronise generated files')
	.action(async () => {
		if (!fs.existsSync('svelte.config.js')) {
			console.warn('Missing svelte.config.js — skipping');
			return;
		}

		try {
			const config = await load_config();
			const sync = await import('./core/sync/sync.js');
			sync.all(config);
		} catch (error) {
			handle_error(error);
		}
	});

prog.parse(process.argv, { unknown: (arg) => `Unknown option: ${arg}` });
