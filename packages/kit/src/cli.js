import { existsSync } from 'fs';
import sade from 'sade';
import colors from 'kleur';
import { load_config } from './core/load_config/index.js';

async function get_config() {
	// TODO this is temporary, for the benefit of early adopters
	if (existsSync('snowpack.config.js') || existsSync('snowpack.config.cjs')) {
		// prettier-ignore
		console.error(colors.bold().red(
			'SvelteKit now uses https://vitejs.dev. Please remove snowpack.config.js and put Vite config in svelte.config.cjs: https://kit.svelte.dev/docs#configuration-vite'
		));
	} else if (existsSync('vite.config.js')) {
		// prettier-ignore
		console.error(colors.bold().red(
			'Please remove vite.config.js and put Vite config in svelte.config.cjs: https://kit.svelte.dev/docs#configuration-vite'
		));
	}

	try {
		return await load_config();
	} catch (error) {
		let message = error.message;

		if (error.code === 'MODULE_NOT_FOUND') {
			if (existsSync('svelte.config.js')) {
				// TODO this is temporary, for the benefit of early adopters
				message = 'You must rename svelte.config.js to svelte.config.cjs';
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

/** @param {Error} error */
function handle_error(error) {
	console.log(colors.bold().red(`> ${error.message}`));
	console.log(colors.gray(error.stack));
	process.exit(1);
}

/** @param {number} port */
async function launch(port) {
	const { exec } = await import('child_process');
	let cmd = 'open';
	if (process.platform == 'win32') {
		cmd = 'start';
	} else if (process.platform == 'linux') {
		cmd = 'xdg-open';
	}
	exec(`${cmd} http://localhost:${port}`);
}

const prog = sade('svelte-kit').version('__VERSION__');

prog
	.command('dev')
	.describe('Start a development server')
	.option('-p, --port', 'Port', 3000)
	.option('-o, --open', 'Open a browser tab', false)
	.action(async ({ port, open }) => {
		process.env.NODE_ENV = 'development';
		const config = await get_config();

		const { dev } = await import('./core/dev/index.js');

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

		try {
			const { build } = await import('./core/build/index.js');
			await build(config);

			console.log(`\nRun ${colors.bold().cyan('npm start')} to try your app locally.`);

			if (config.kit.adapter) {
				const { adapt } = await import('./core/adapt/index.js');
				await adapt(config, { verbose });
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

		const { start } = await import('./core/start/index.js');

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
	.action(async () => {
		console.log('"svelte-kit build" will now run the adapter');
	});

prog.parse(process.argv, { unknown: (arg) => `Unknown option: ${arg}` });
