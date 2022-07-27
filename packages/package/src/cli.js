import colors from 'kleur';
import sade from 'sade';
import { load_config } from './config.js';
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

const prog = sade('svelte-package').version('__VERSION__');

prog
	.describe('Create a package')
	.option('-w, --watch', 'Rerun when files change', false)
	.action(async ({ watch }) => {
		try {
			const config = await load_config();
			const packaging = await import('./index.js');

			await (watch ? packaging.watch(config) : packaging.build(config));
		} catch (error) {
			handle_error(error);
		}
	});

prog.parse(process.argv, { unknown: (arg) => `Unknown option: ${arg}` });
