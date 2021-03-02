import { existsSync } from 'fs';
import sade from 'sade';
import colors from 'kleur';
import { load_config } from './api/load_config';
import * as pkg from '../package.json';

async function get_config() {
	// TODO this is temporary, for the benefit of early adopters
	if (existsSync('snowpack.config.js') || existsSync('snowpack.config.cjs')) {
		// prettier-ignore
		console.error(colors.bold().red(
			'SvelteKit now uses https://vitejs.dev. Please replace snowpack.config.js with vite.config.js:'
		));

		// prettier-ignore
		console.error(`
			import { resolve } from 'path';

			export default {
				resolve: {
					alias: {
						$components: resolve('src/components')
					}
				}
			};
		`.replace(/^\t{3}/gm, '').replace(/\t/gm, '  ').trim());
	}

	try {
		return await load_config();
	} catch (error) {
		let message = error.message;

		if (error.code === 'MODULE_NOT_FOUND') {
			if (existsSync('svelte.config.js')) {
				// TODO this is temporary, for the benefit of early adopters
				message =
					'You must rename svelte.config.js to svelte.config.cjs, and snowpack.config.js to snowpack.config.cjs';
			} else {
				message = 'Missing svelte.config.cjs';
			}
		} else if (error.name === 'SyntaxError') {
			message = 'Malformed svelte.config.cjs';
		}

		console.error(colors.bold().red(message));
		console.error(colors.grey(error.stack));
		process.exit(1);
	}
}

function handle_error(error) {
	console.log(colors.bold().red(`> ${error.message}`));
	console.log(colors.gray(error.stack));
	process.exit(1);
}

async function launch(port) {
	const { exec } = await import('child_process');
	exec(`${process.platform == 'win32' ? 'start' : 'open'} http://localhost:${port}`);
}

const prog = sade('svelte-kit').version(pkg.version);

prog
	.command('dev')
	.describe('Start a development server')
	.option('-p, --port', 'Port', 3000)
	.option('-o, --open', 'Open a browser tab', false)
	.action(async ({ port, open }) => {
		process.env.NODE_ENV = 'development';
		const config = await get_config();

		const { dev } = await import('./api/dev');

		try {
			const watcher = await dev({ port, config });

			watcher.on('stdout', (data) => {
				process.stdout.write(data);
			});

			watcher.on('stderr', (data) => {
				process.stderr.write(data);
			});

			console.log(colors.bold().cyan(`> Listening on http://localhost:${watcher.port}`));
			if (open) launch(watcher.port);
		} catch (error) {
			handle_error(error);
		}
	});

prog
	.command('build')
	.describe('Create a production build of your app')
	.option('--verbose', 'Log more stuff', false)
	.action(async ({ verbose }) => {
		process.env.NODE_ENV = 'production';
		const config = await get_config();

		const { build } = await import('./api/build');
		const { adapt } = await import('./api/adapt');

		try {
			const cwd = '.svelte/output';

			await build(config, { cwd });
			console.log(`\nRun ${colors.bold().cyan('npm start')} to try your app locally.`);

			if (config.adapter[0]) {
				await adapt(config, { cwd, verbose });
			} else {
				console.log(colors.bold().yellow('\nNo adapter specified'));

				// prettier-ignore
				console.log(
					`See ${colors.bold().cyan('https://kit.svelte.dev/docs#adapters')} to learn how to configure your app to run on the platform of your choosing`
				);
			}
		} catch (error) {
			handle_error(error);
		}
	});

prog
	.command('start')
	.describe('Serve an already-built app')
	.option('-p, --port', 'Port', 3000)
	.option('-o, --open', 'Open a browser tab', false)
	.action(async ({ port, open }) => {
		process.env.NODE_ENV = 'production';
		const config = await get_config();

		const { start } = await import('./api/start');

		try {
			await start({ port, config });

			console.log(colors.bold().cyan(`> Listening on http://localhost:${port}`));
			if (open) if (open) launch(port);
		} catch (error) {
			handle_error(error);
		}
	});

// For the benefit of early-adopters. Can later be removed
prog
	.command('adapt')
	.describe('Customise your production build for different platforms')
	.option('--verbose', 'Log more stuff', false)
	.action(async ({ verbose }) => {
		console.log('"svelte-kit build" will now run the adapter');
	});

prog.parse(process.argv, { unknown: (arg) => `Unknown option: ${arg}` });
