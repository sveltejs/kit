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

const prog = sade('svelte-package', true).version('__VERSION__');

prog
	.describe('Create a package')
	.option('-i, --input', 'Input directory')
	.option('-o, --output', 'Output directory', 'dist')
	.option('-t, --types', 'Emit type declarations', true)
	.option('-w, --watch', 'Rerun when files change', false)
	.action(async (args) => {
		try {
			const config = await load_config();

			if (config.package) {
				throw new Error(
					`config.package is no longer supported. See https://github.com/sveltejs/kit/discussions/8825 for more information.`
				);
			}

			const packaging = await import('./index.js');

			/** @type {import('./types').Options} */
			const options = {
				cwd: process.cwd(),
				input: args.input ?? config.kit?.files?.lib ?? 'src/lib',
				output: args.output,
				types: args.types,
				config
			};

			await (args.watch ? packaging.watch(options) : packaging.build(options));
		} catch (error) {
			handle_error(/** @type {Error} */ (error));
		}
	});

prog.parse(process.argv, { unknown: (arg) => `Unknown option: ${arg}` });
