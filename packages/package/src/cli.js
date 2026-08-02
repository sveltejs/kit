import fs from 'node:fs';
import process from 'node:process';
import { parseArgs, styleText } from 'node:util';
import { load_config } from './config.js';

/** @param {Error} error */
function handle_error(error) {
	if (error.name === 'SyntaxError') throw error;

	console.error(styleText(['bold', 'red'], `> ${error.message}`));
	if (error.stack) {
		console.error(styleText('grey', error.stack.split('\n').slice(1).join('\n')));
	}

	process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));

const help = `
  Usage: svelte-package [options]

  Options:
    --input, -i <input>         Input directory
    --output, -o <output>      Output directory (default: dist)
    --preserve-output, -p      Do not delete the output directory before packaging
    --types, -t                Emit type declarations (default: true)
    --watch, -w                Rerun when files change
    --tsconfig <tsconfig>      A path to a tsconfig or jsconfig file. When not provided, searches
                               for the next upper tsconfig/jsconfig in the workspace path.
    --version, -v              Show version number
    --help, -h                 Show this help message
`;

let parsed;
try {
	parsed = parseArgs({
		options: {
			input: { type: 'string', short: 'i' },
			output: { type: 'string', short: 'o', default: 'dist' },
			'preserve-output': { type: 'boolean', short: 'p', default: false },
			types: { type: 'boolean', short: 't', default: true },
			watch: { type: 'boolean', short: 'w', default: false },
			tsconfig: { type: 'string' },
			version: { type: 'boolean', short: 'v' },
			help: { type: 'boolean', short: 'h' }
		},
		allowPositionals: false,
		allowNegative: true,
		strict: true
	});
} catch (err) {
	const error = /** @type {Error} */ (err);
	console.error(styleText(['bold', 'red'], `> ${error.message}`));
	console.log(help);
	process.exit(1);
}

const { values } = parsed;

if (values.version) {
	console.log(pkg.version);
	process.exit(0);
}

if (values.help) {
	console.log(help);
	process.exit(0);
}

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
		input: values.input ?? config.kit?.files?.lib ?? 'src/lib',
		output: values.output,
		preserve_output: values['preserve-output'],
		tsconfig: values.tsconfig,
		types: values.types,
		config
	};

	await (values.watch ? packaging.watch(options) : packaging.build(options));
} catch (error) {
	handle_error(/** @type {Error} */ (error));
}
