import sade from 'sade';
import colors from 'kleur';
import { load_config } from './api/load_config';
import * as pkg from '../package.json';

let config;

try {
	config = load_config();
} catch (error) {
	const adjective = error.code === 'ENOENT' ? 'Missing' : 'Malformed';

	console.error(colors.bold().red(`${adjective} svelte.config.js`));
	console.error(colors.grey(error.stack));
	process.exit(1);
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

const prog = sade('svelte').version(pkg.version);

prog
	.command('dev')
	.describe('Start a development server')
	.option('-p, --port', 'Port', 3000)
	.option('-o, --open', 'Open a browser tab', false)
	.action(async ({ port, open }) => {
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
	.describe('Create a deployment-ready version of your app')
	.action(async () => {
		const { build } = await import('./api/build');

		try {
			await build(config);
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
		const { start } = await import('./api/start');

		try {
			await start({ port, config });

			console.log(colors.bold().cyan(`> Listening on http://localhost:${port}`));
			if (open) if (open) launch(port);
		} catch (error) {
			handle_error(error);
		}
	});

prog.parse(process.argv, { unknown: (arg) => `Unknown option: ${arg}` });
