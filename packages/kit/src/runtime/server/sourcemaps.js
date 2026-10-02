/* eslint-disable n/prefer-global/process */

// using `getBuiltinModule` rather than `import` makes this safe to run in non-Node-compatible environments
const fs = globalThis.process?.getBuiltinModule?.('node:fs');
const url = globalThis.process?.getBuiltinModule?.('node:url');
const path = globalThis.process?.getBuiltinModule?.('node:path');
const module = globalThis.process?.getBuiltinModule?.('node:module');

const cwd = globalThis.process?.cwd?.();

/** @type {(file: string) => string} */
const relative = cwd ? (file) => path.relative(cwd, file) : (file) => file;

/**
 * Applies sourcemaps, makes paths relative to the cwd, and truncates
 * non-user code from the bottom of the stack
 * @param {Error} error
 * @returns void
 */
export let fix_stack_trace = (error) => {
	if (!error.stack || !fs) return;

	let end = 0;

	error.stack = error.stack
		.split('\n')
		.map((line, i) => {
			const match = line.match(/^ {4}at.+(file:\/\/\/.*):(\d+):(\d+)(\)?)$/);

			if (!match) {
				if (!line.includes('node:internal/')) {
					end = i + 1;
				}

				return line;
			}

			const file = url.fileURLToPath(match[1]);
			const traced = trace(file, Number(match[2]) - 1, Number(match[3]) - 1);

			// truncate non-user code from the bottom of the stack (but leave it in otherwise)
			if (!/[\\/]node_modules[\\/]/.test(traced?.file ?? file)) {
				end = i + 1;
			}

			if (traced?.line) {
				const location = `${match[1]}:${match[2]}:${match[3]}`;
				const original = `${relative(traced.file)}:${traced.line}:${traced.column}`;

				return line.replace(location, original);
			}

			if (traced) {
				return `${line.replace(match[1], relative(file))} [${traced.file}]`;
			}

			return line;
		})
		.slice(0, end)
		.join('\n');
};

/**
 * Override the implementation of fix_stack_trace (for using during dev)
 * @param {(error: Error) => void} fn
 */
export function set_fix_stack_trace(fn) {
	fix_stack_trace = fn;
}

/** @type {Map<string, { map: import('node:module').SourceMap; directory: string } | null>} */
const source_maps = new Map();

/** @type {Map<string, Array<string | undefined>>} */
const source_regions = new Map();

/** @param {string} file */
function get_source_map(file) {
	if (source_maps.has(file)) {
		return source_maps.get(file);
	}

	try {
		let source;
		let directory = path.dirname(file);

		const code = fs.readFileSync(file, 'utf8');
		const matches = Array.from(code.matchAll(/\/\/[#@]\s*sourceMappingURL=(\S+)/g));
		const url = matches.at(-1)?.[1];

		if (url?.startsWith('data:')) {
			const comma = url.indexOf(',');
			const metadata = url.slice(5, comma);
			const data = url.slice(comma + 1);
			source = metadata.endsWith(';base64')
				? Buffer.from(data, 'base64').toString()
				: decodeURIComponent(data);
		} else {
			const map_file = url
				? path.resolve(path.dirname(file), decodeURIComponent(url))
				: `${file}.map`;
			if (fs.existsSync(map_file)) {
				directory = path.dirname(map_file);
				source = fs.readFileSync(map_file, 'utf8');
			}
		}

		if (source) {
			const source_map = { map: new module.SourceMap(JSON.parse(source)), directory };
			source_maps.set(file, source_map);

			return source_map;
		}
	} catch {
		// failure could be for any reason and this is best-effort, ignore
	}

	source_maps.set(file, null);
	return null;
}

/**
 *
 * @param {string} file
 * @param {number} line
 * @param {number} column
 * @returns {null | { file: string, line?: number, column?: number }}
 */
function trace(file, line, column) {
	const source_map = get_source_map(file);
	if (!source_map) return null;

	const entry = source_map.map.findEntry(line, column);

	if (
		entry &&
		'originalSource' in entry &&
		entry.originalSource &&
		typeof entry.originalLine === 'number' &&
		typeof entry.originalColumn === 'number'
	) {
		const source = entry.originalSource.startsWith('file:')
			? url.fileURLToPath(entry.originalSource)
			: path.resolve(source_map.directory, entry.originalSource);

		const traced = {
			file: source,
			line: entry.originalLine + 1,
			column: entry.originalColumn + 1
		};

		// keep going, in case we are running code that was bundled a second time by an adapter
		return trace(traced.file, traced.line - 1, traced.column - 1) ?? traced;
	}

	let regions = source_regions.get(file);
	if (!regions) {
		/** @type {string | undefined} */
		let source;
		regions = fs
			.readFileSync(file, 'utf8')
			.split('\n')
			.map((line) => {
				// Vite will merge multiple files into one but add region markers
				// with the original file names, which we try to extract here.
				const start = line.match(/^\/\/#region (.+)$/);
				if (start) source = start[1];
				if (line === '//#endregion') source = undefined;
				return source;
			});
		source_regions.set(file, regions);
	}

	const source = regions[line];

	if (source) {
		return {
			file: source
		};
	}

	return null;
}
