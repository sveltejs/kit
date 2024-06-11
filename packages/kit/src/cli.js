import fs from 'node:fs';
import path from 'node:path';
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

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));
const prog = sade('svelte-kit').version(pkg.version);

prog
	.command('sync')
	.describe('Synchronise generated type definitions')
	.option('--mode', 'Specify a mode for loading environment variables', 'development')
	.action(async ({ mode }) => {
		if (!fs.existsSync('svelte.config.js')) {
			console.warn(`Missing ${path.resolve('svelte.config.js')} — skipping`);
			return;
		}

		try {
			const config = await load_config();
			const sync = await import('./core/sync/sync.js');
			sync.all_types(config, mode);
		} catch (error) {
			handle_error(error);
		}
	});

prog.parse(process.argv, { unknown: (arg) => `Unknown option: ${arg}` });
