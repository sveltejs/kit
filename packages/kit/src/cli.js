import sade from 'sade';
import colors from 'kleur';
import { load_config } from './api/load_config';
import * as pkg from '../package.json';

let config;

try {
	config = load_config();
} catch (err) {
	const adjective = err.code === 'ENOENT' ? 'Missing' : 'Malformed';

	console.error(colors.bold().red(`${adjective} svelte.config.js`));
	console.error(colors.grey(err.stack));
	process.exit(1);
}

const prog = sade('svelte').version(pkg.version);

prog
	.command('dev')
	.describe('Start a development server')
	.option('-p, --port', 'Dev server port', 3000)
	.option('-o, --open', 'Open a browser tab', false)
	.action(async (opts) => {
		const { dev } = await import('./api/dev');

		try {
			const watcher = await dev({
				port: opts.port,
				config
			});

			let first = true;

			watcher.on('stdout', (data) => {
				process.stdout.write(data);
			});

			watcher.on('stderr', (data) => {
				process.stderr.write(data);
			});

			watcher.on('ready', async (event) => {
				if (first) {
					console.log(colors.bold().cyan(`> Listening on http://localhost:${event.port}`));
					if (opts.open) {
						const { exec } = await import('child_process');
						exec(`open http://localhost:${event.port}`);
					}
					first = false;
				}
			});
		} catch (err) {
			console.log(colors.bold().red(`> ${err.message}`));
			console.log(colors.gray(err.stack));
			process.exit(1);
		}
	});

prog
	.command('build [dest]')
	.describe('Create a deployment-ready version of your app')
	.action(async () => {
		const { build } = await import('./api/build');

		try {
			await build(config);
		} catch (err) {
			console.log(colors.bold().red(`> ${err.message}`));
			console.log(colors.gray(err.stack));
			process.exit(1);
		}
	});

prog.parse(process.argv, { unknown: (arg) => `Unknown option: ${arg}` });
