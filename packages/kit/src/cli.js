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
	.action(async () => {
		const is_postinstall = process.env.npm_lifecycle_event === 'postinstall';
		const cwd = is_postinstall ? process.env.INIT_CWD || '' : process.cwd();
		const config_file = path.join(cwd, 'svelte.config.js');
		const pkg_file = path.join(cwd, 'package.json');
		let is_self = false;
		if (fs.existsSync(pkg_file)) {
			try {
				const pkg = JSON.parse(fs.readFileSync(pkg_file, 'utf-8'));
				is_self = pkg.name === '@sveltejs/kit';
				if (pkg.scripts?.prepare === 'svelte-kit sync') {
					const message = `script "prepare": "svelte-kit sync" in ${pkg_file} is no longer needed. Remove it.`;
					console.error(colors.bold().red(message));
				}
			} catch (e) {
				// ignore, we can be sure that our own package.json exists and can be parsed, so it is not self
			}
		}
		if (is_self || !fs.existsSync(config_file)) {
			if (!is_postinstall) {
				console.warn(
					`Your project at ${cwd} does not have a svelte.config.js  — skipping svelte-kit sync`
				);
			}
			return;
		}

		try {
			const config = await load_config({ cwd });
			const sync = await import('./core/sync/sync.js');
			sync.all(config);
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
