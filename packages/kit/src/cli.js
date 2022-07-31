import fs from 'fs';
import path from 'path';
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
	.option('--mode', 'Specify a mode for loading environment variables', 'development')
	.action(async ({ mode }) => {
		const event = process.env.npm_lifecycle_event;

		// TODO remove for 1.0
		if (event === 'prepare') {
			const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
			const message =
				pkg.scripts.prepare === 'svelte-kit sync'
					? `\`svelte-kit sync\` now runs on "postinstall" — please remove the "prepare" script from your package.json\n`
					: `\`svelte-kit sync\` now runs on "postinstall" — please remove it from your "prepare" script\n`;

			console.error(colors.bold().red(message));
			return;
		}

		const cwd = event === 'postinstall' ? process.env.INIT_CWD ?? '' : process.cwd();

		const svelte_config_file = path.join(cwd, 'svelte.config.js');
		if (!fs.existsSync(svelte_config_file)) {
			console.warn(`Missing ${svelte_config_file} — skipping`);
			return;
		}

		try {
			const config = await load_config({ cwd });
			const sync = await import('./core/sync/sync.js');
			sync.all(config, mode);
		} catch (error) {
			handle_error(error);
		}
	});

// TODO remove for 1.0
replace('dev');
replace('build');
replace('preview');

prog.parse(process.argv, { unknown: (arg) => `Unknown option: ${arg}` });

/** @param {string} command */
function replace(command) {
	prog
		.command(command)
		.describe(`No longer available — use vite ${command} instead`)
		.action(async () => {
			const message = `\n> svelte-kit ${command} is no longer available — use vite ${command} instead`;
			console.error(colors.bold().red(message));

			const steps = [
				'Install vite as a devDependency with npm/pnpm/etc',
				'Create a vite.config.js with the @sveltejs/kit/vite plugin (see below)',
				`Update your package.json scripts to reference \`vite ${command}\` instead of \`svelte-kit ${command}\``
			];

			steps.forEach((step, i) => {
				console.error(`  ${i + 1}. ${colors.cyan(step)}`);
			});

			console.error(
				`
				${colors.grey('// vite.config.js')}
				import { sveltekit } from '@sveltejs/kit/vite';

				/** @type {import('vite').UserConfig} */
				const config = {
					plugins: [sveltekit()]
				};

				export default config;

				`.replace(/^\t{4}/gm, '')
			);
			process.exit(1);
		});
}
