import fs from 'node:fs';
import process from 'node:process';
import { parseArgs } from 'node:util';
import colors from 'kleur';
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

const help = `
  Usage: svelte-kit <command> [options]

  Commands:
    sync        Synchronise generated type definitions

  Options:
    --version, -v   Show version number
    --help, -h      Show this help message

  Sync Options:
    --mode <mode>   Specify a mode for loading environment variables (default: development)
`;

let parsed;
try {
	parsed = parseArgs({
		options: {
			version: { type: 'boolean', short: 'v' },
			help: { type: 'boolean', short: 'h' },
			mode: { type: 'string', default: 'development' }
		},
		allowPositionals: true,
		strict: true
	});
} catch (err) {
	const error = /** @type {Error} */ (err);
	console.error(colors.bold().red(`> ${error.message}`));
	console.log(help);
	process.exit(1);
}

const { values, positionals } = parsed;

if (values.version) {
	console.log(pkg.version);
	process.exit(0);
}

if (values.help) {
	console.log(help);
	process.exit(0);
}

const command = positionals[0];

if (!command) {
	console.log(help);
	process.exit(0);
}

if (command === 'sync') {
	const config_files = ['js', 'ts']
		.map((ext) => `svelte.config.${ext}`)
		.filter((f) => fs.existsSync(f));
	if (config_files.length === 0) {
		console.warn(`Missing Svelte config file in ${process.cwd()} — skipping`);
		process.exit(0);
	}

	try {
		const config = await load_config();
		const sync = await import('./core/sync/sync.js');
		sync.all_types(config, values.mode);
	} catch (error) {
		handle_error(error);
	}
} else {
	console.error(colors.bold().red(`> Unknown command: ${command}`));
	console.log(help);
	process.exit(1);
}
