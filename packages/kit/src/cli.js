import { existsSync } from 'fs';
import sade from 'sade';
import colors from 'kleur';
import * as ports from 'port-authority';
import { load_config } from './core/config/index.js';
import { networkInterfaces, release } from 'os';

async function get_config() {
	// TODO this is temporary, for the benefit of early adopters
	if (existsSync('svelte.config.cjs')) {
		// prettier-ignore
		console.error(colors.bold().red(
			'svelte.config.cjs should be renamed to svelte.config.js and converted to an ES module. See https://kit.svelte.dev/docs#configuration for an example'
		));
	}

	if (existsSync('vite.config.js')) {
		// prettier-ignore
		console.error(colors.bold().red(
			'Please remove vite.config.js and put Vite config in svelte.config.js: https://kit.svelte.dev/docs#configuration-vite'
		));
	}

	try {
		return await load_config();
	} catch (error) {
		let message = error.message;

		if (
			error.code === 'MODULE_NOT_FOUND' &&
			/Cannot find module svelte\.config\./.test(error.message)
		) {
			message = 'Missing svelte.config.js';
		} else if (error.name === 'SyntaxError') {
			message = 'Malformed svelte.config.js';
		}

		console.error(colors.bold().red(message));
		console.error(colors.grey(error.stack));
		process.exit(1);
	}
}

/** @param {Error} error */
function handle_error(error) {
	console.log(colors.bold().red(`> ${error.message}`));
	if (error.stack) {
		console.log(colors.gray(error.stack));
	}
	process.exit(1);
}

/**
 * @param {number} port
 * @param {boolean} https
 */
async function launch(port, https) {
	const { exec } = await import('child_process');
	let cmd = 'open';
	if (process.platform == 'win32') {
		cmd = 'start';
	} else if (process.platform == 'linux') {
		if (/microsoft/i.test(release())) {
			cmd = 'cmd.exe /c start';
		} else {
			cmd = 'xdg-open';
		}
	}
	exec(`${cmd} ${https ? 'https' : 'http'}://localhost:${port}`);
}

const prog = sade('svelte-kit').version('__VERSION__');

prog
	.command('dev')
	.describe('Start a development server')
	.option('-p, --port', 'Port', 3000)
	.option('-h, --host', 'Host (only use this on trusted networks)', 'localhost')
	.option('-H, --https', 'Use self-signed HTTPS certificate', false)
	.option('-o, --open', 'Open a browser tab', false)
	.action(async ({ port, host, https, open }) => {
		await check_port(port);

		process.env.NODE_ENV = process.env.NODE_ENV || 'development';
		const config = await get_config();

		const { dev } = await import('./core/dev/index.js');

		try {
			const watcher = await dev({ port, host, https, config });

			watcher.on('stdout', (data) => {
				process.stdout.write(data);
			});

			watcher.on('stderr', (data) => {
				process.stderr.write(data);
			});

			welcome({ port, host, https, open });
		} catch (error) {
			handle_error(error);
		}
	});

prog
	.command('build')
	.describe('Create a production build of your app')
	.option('--verbose', 'Log more stuff', false)
	.action(async ({ verbose }) => {
		process.env.NODE_ENV = process.env.NODE_ENV || 'production';
		const config = await get_config();

		try {
			const { build } = await import('./core/build/index.js');
			const build_data = await build(config);

			console.log(
				`\nRun ${colors.bold().cyan('npm run preview')} to preview your production build locally.`
			);

			if (config.kit.adapter) {
				const { adapt } = await import('./core/adapt/index.js');
				await adapt(config, build_data, { verbose });

				// this is necessary to close any open db connections, etc
				process.exit(0);
			}

			console.log(colors.bold().yellow('\nNo adapter specified'));

			// prettier-ignore
			console.log(
				`See ${colors.bold().cyan('https://kit.svelte.dev/docs#adapters')} to learn how to configure your app to run on the platform of your choosing`
			);
		} catch (error) {
			handle_error(error);
		}
	});

prog
	.command('preview')
	.describe('Serve an already-built app')
	.option('-p, --port', 'Port', 3000)
	.option('-h, --host', 'Host (only use this on trusted networks)', 'localhost')
	.option('-H, --https', 'Use self-signed HTTPS certificate', false)
	.option('-o, --open', 'Open a browser tab', false)
	.action(async ({ port, host, https, open }) => {
		await check_port(port);

		process.env.NODE_ENV = process.env.NODE_ENV || 'production';
		const config = await get_config();

		const { preview } = await import('./core/preview/index.js');

		try {
			await preview({ port, host, config, https });

			welcome({ port, host, https, open });
		} catch (error) {
			handle_error(error);
		}
	});

// TODO remove this after a few versions
prog
	.command('start')
	.describe('Deprecated — use svelte-kit preview instead')
	.option('-p, --port', 'Port', 3000)
	.option('-h, --host', 'Host (only use this on trusted networks)', 'localhost')
	.option('-H, --https', 'Use self-signed HTTPS certificate', false)
	.option('-o, --open', 'Open a browser tab', false)
	.action(async () => {
		console.log(
			colors
				.bold()
				.red(
					'"svelte-kit preview" will now preview your production build locally. Note: it is not intended for production use'
				)
		);
	});

prog
	.command('package')
	.describe('Create a package')
	.option('-d, --dir', 'Destination directory', 'package')
	.action(async () => {
		const config = await get_config();

		const { make_package } = await import('./core/make_package/index.js');

		try {
			await make_package(config);
		} catch (error) {
			handle_error(error);
		}
	});

prog.parse(process.argv, { unknown: (arg) => `Unknown option: ${arg}` });

/** @param {number} port */
async function check_port(port) {
	const n = await ports.blame(port);

	if (n) {
		console.log(colors.bold().red(`Port ${port} is occupied`));

		// prettier-ignore
		console.log(
			`Terminate process ${colors.bold(n)} or specify a different port with ${colors.bold('--port')}\n`
		);

		process.exit(1);
	}
}

/**
 * @param {{
 *   open: boolean;
 *   host: string;
 *   https: boolean;
 *   port: number;
 * }} param0
 */
function welcome({ port, host, https, open }) {
	if (open) launch(port, https);

	console.log(colors.bold().cyan(`\n  SvelteKit v${'__VERSION__'}\n`));

	const protocol = https ? 'https:' : 'http:';
	const exposed = host !== 'localhost' && host !== '127.0.0.1';

	Object.values(networkInterfaces()).forEach((interfaces) => {
		if (!interfaces) return;
		interfaces.forEach((details) => {
			if (details.family !== 'IPv4') return;

			// prettier-ignore
			if (details.internal) {
				console.log(`  ${colors.gray('local:  ')} ${protocol}//${colors.bold(`localhost:${port}`)}`);
			} else {
				if (details.mac === '00:00:00:00:00:00') return;

				if (exposed) {
					console.log(`  ${colors.gray('network:')} ${protocol}//${colors.bold(`${details.address}:${port}`)}`);
				} else {
					console.log(`  ${colors.gray('network: not exposed')}`);
				}
			}
		});
	});

	if (!exposed) {
		console.log('\n  Use --host to expose server to other devices on this network');
	}

	console.log('\n');
}
