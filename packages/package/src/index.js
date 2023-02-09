import * as fs from 'node:fs';
import * as path from 'node:path';
import colors from 'kleur';
import chokidar from 'chokidar';
import { preprocess } from 'svelte/compiler';
import { copy, mkdirp, rimraf } from './filesystem.js';
import { analyze, resolve_aliases, scan, strip_lang_tags, write } from './utils.js';
import { emit_dts, transpile_ts } from './typescript.js';
import { create_validator } from './validate.js';

/**
 * @param {import('./types').Options} options
 */
export async function build(options) {
	const { analyse_code, validate } = create_validator(options);
	await do_build(options, analyse_code);
	validate();
}

/**
 * @param {import('./types').Options} options
 * @param {(name: string, code: string) => void} analyse_code
 */
async function do_build(options, analyse_code) {
	const { input, output, extensions, alias } = normalize_options(options);

	if (!fs.existsSync(input)) {
		throw new Error(`${path.relative('.', input)} does not exist`);
	}

	rimraf(output);
	mkdirp(output);

	const files = scan(input, extensions);

	if (options.types) {
		await emit_dts(input, output, options.cwd, alias, files);
	}

	for (const file of files) {
		await process_file(input, output, file, options.config.preprocess, alias, analyse_code);
	}

	console.log(
		colors
			.bold()
			.green(`${path.relative(options.cwd, input)} -> ${path.relative(options.cwd, output)}`)
	);
}

/**
 * @param {import('./types').Options} options
 */
export async function watch(options) {
	const { analyse_code, validate } = create_validator(options);

	await do_build(options, analyse_code);

	validate();

	const { input, output, extensions, alias } = normalize_options(options);

	const message = `\nWatching ${path.relative(options.cwd, input)} for changes...\n`;

	console.log(message);

	/** @type {Array<{ file: import('./types').File, type: string }>} */
	const pending = [];

	/** @type {Array<(value?: any) => void>} */
	const fulfillers = [];

	/** @type {NodeJS.Timeout} */
	let timeout;

	const watcher = chokidar.watch(input, { ignoreInitial: true });
	const ready = new Promise((resolve) => watcher.on('ready', resolve));

	watcher.on('all', async (type, filepath) => {
		const file = analyze(path.relative(input, filepath), extensions);

		pending.push({ file, type });

		clearTimeout(timeout);
		timeout = setTimeout(async () => {
			const files = scan(input, extensions);

			const events = pending.slice();
			pending.length = 0;

			for (const { file, type } of events) {
				if (type === 'unlink') {
					for (const candidate of [
						file.name,
						`${file.base}.d.ts`,
						`${file.base}.d.mts`,
						`${file.base}.d.cts`
					]) {
						const resolved = path.join(output, candidate);

						if (fs.existsSync(resolved)) {
							fs.unlinkSync(resolved);

							const parent = path.dirname(resolved);
							if (parent !== output && fs.readdirSync(parent).length === 0) {
								fs.rmdirSync(parent);
							}
						}
					}
					console.log(`Removed ${file.dest}`);
				}

				if (type === 'add' || type === 'change') {
					console.log(`Processing ${file.name}`);
					await process_file(input, output, file, options.config.preprocess, alias, analyse_code);
					validate();
				}
			}

			if (options.types) {
				await emit_dts(input, output, options.cwd, alias, files);
				console.log('Updated .d.ts files');
			}

			console.log(message);

			fulfillers.forEach((fn) => fn());
		}, 100);
	});

	return {
		watcher,
		ready,
		settled: () =>
			new Promise((fulfil, reject) => {
				fulfillers.push(fulfil);
				setTimeout(() => reject(new Error('Timed out')), 1000);
			})
	};
}

/**
 * @param {import('./types').Options} options
 */
function normalize_options(options) {
	const input = path.resolve(options.cwd, options.input);
	const output = path.resolve(options.cwd, options.output);
	const extensions = options.config.extensions ?? ['.svelte'];

	const alias = {
		$lib: path.resolve(options.cwd, options.config.kit?.files?.lib ?? 'src/lib'),
		...(options.config.kit?.alias ?? {})
	};

	return {
		input,
		output,
		extensions,
		alias
	};
}

/**
 * @param {string} input
 * @param {string} output
 * @param {import('./types').File} file
 * @param {import('svelte/types/compiler/preprocess').PreprocessorGroup | undefined} preprocessor
 * @param {Record<string, string>} aliases
 * @param {(name: string, code: string) => void} analyse_code
 */
async function process_file(input, output, file, preprocessor, aliases, analyse_code) {
	const filename = path.join(input, file.name);
	const dest = path.join(output, file.dest);

	if (file.is_svelte || file.name.endsWith('.ts') || file.name.endsWith('.js')) {
		let contents = fs.readFileSync(filename, 'utf-8');

		if (file.is_svelte) {
			if (preprocessor) {
				const preprocessed = (await preprocess(contents, preprocessor, { filename })).code;
				contents = strip_lang_tags(preprocessed);
			}
		}

		if (file.name.endsWith('.ts') && !file.name.endsWith('.d.ts')) {
			contents = await transpile_ts(filename, contents);
		}

		contents = resolve_aliases(input, file.name, contents, aliases);
		analyse_code(file.name, contents);
		write(dest, contents);
	} else {
		copy(filename, dest);
	}
}
