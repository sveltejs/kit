import fs from 'node:fs';
import process from 'node:process';
import { parseArgs } from 'node:util';
import colors from 'kleur';
import { load_config } from './core/config/index.js';
import { coalesce_to_error } from './utils/error.js';
import { resolve_explicit_env_entry } from './core/env.js';

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
	// create placeholder .svelte-kit/tsconfig.json if necessary, to squelch warnings.
	// this isn't bulletproof — if someone has some esoteric config, it will continue
	// to harmlessly warn — but we handle the 90% case and clean up after ourselves
	const sveltekit_dir = '.svelte-kit';
	const base_tsconfig = `${sveltekit_dir}/tsconfig.json`;
	const base_tsconfig_json = '{}';

	const sveltekit_dir_exists = fs.existsSync(sveltekit_dir);
	const base_tsconfig_exists = fs.existsSync(base_tsconfig);

	if (!base_tsconfig_exists) {
		try {
			fs.mkdirSync('.svelte-kit');
		} catch {
			// ignore
		}

		fs.writeFileSync(base_tsconfig, base_tsconfig_json);
	}

	try {
		const config = await load_config();
		const sync = await import('./core/sync/sync.js');
		sync.all_types(config, values.mode);

		const explicit_env_entry = resolve_explicit_env_entry(config.kit);
		await sync.env(config.kit, explicit_env_entry, values.mode);
	} catch (error) {
		handle_error(error);
	} finally {
		// if we errored, or accidentally created the wrong file
		// (could happen!) then clean up after ourselves
		if (fs.readFileSync(base_tsconfig, 'utf-8') === base_tsconfig_json) {
			fs.unlinkSync(base_tsconfig);
		}

		if (!sveltekit_dir_exists && fs.readdirSync(sveltekit_dir).length === 0) {
			fs.rmSync(sveltekit_dir, { recursive: true });
		}
	}
} else {
	console.error(colors.bold().red(`> Unknown command: ${command}`));
	console.log(help);
	process.exit(1);
}
