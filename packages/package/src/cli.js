import fs from 'node:fs';
import process from 'node:process';
import colors from 'kleur';
import sade from 'sade';
import { load_config } from './config.js';

/** @param {Error} error */
function handle_error(error) {
	if (error.name === 'SyntaxError') throw error;

	console.error(colors.bold().red(`> ${error.message}`));
	if (error.stack) {
		console.error(colors.gray(error.stack.split('\n').slice(1).join('\n')));
	}

	process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));
const prog = sade('svelte-package', true).version(pkg.version);

prog
	.describe('Create a package')
	.option('-i, --input', 'Input directory')
	.option('-o, --output', 'Output directory', 'dist')
	.option('-t, --types', 'Emit type declarations', true)
	.option('-w, --watch', 'Rerun when files change', false)
	.option(
		'--tsconfig',
		'A path to a tsconfig or jsconfig file. When not provided, searches for the next upper tsconfig/jsconfig in the workspace path.'
	)
	.action(async (args) => {
		try {
			const config = await load_config();

			// @ts-expect-error
			if (config.package) {
				throw new Error(
					'config.package is no longer supported. See https://github.com/sveltejs/kit/pull/8922 for more information and how to migrate.'
				);
			}

			const packaging = await import('./index.js');

			/** @type {import('./types.js').Options} */
			const options = {
				cwd: process.cwd(),
				input: args.input ?? config.kit?.files?.lib ?? 'src/lib',
				output: args.output,
				tsconfig: args.tsconfig,
				types: args.types,
				config
			};

			await (args.watch ? packaging.watch(options) : packaging.build(options));
		} catch (error) {
			handle_error(/** @type {Error} */ (error));
		}
	});

prog.parse(process.argv, { unknown: (arg) => `Unknown option: ${arg}` });
