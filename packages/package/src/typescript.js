import * as fs from 'node:fs';
import * as path from 'node:path';
import { createRequire } from 'node:module';
import semver from 'semver';
import { posixify, walk } from './filesystem.js';
import { resolve_aliases, write } from './utils.js';
import { emitDts } from 'svelte2tsx';
import { load_pkg_json } from './config.js';

/**
 * Generates d.ts files by invoking TypeScript's "emit d.ts files from input files".
 * The files are written to a temporary location and those which should be kept
 * are sanitized ($lib alias resolved) and copied over to the destination folder.
 *
 * @param {string} input
 * @param {string} output
 * @param {string} final_output
 * @param {string} cwd
 * @param {Record<string, string>} alias
 * @param {import('./types.js').File[]} files
 * @param {string | undefined} tsconfig
 */
export async function emit_dts(input, output, final_output, cwd, alias, files, tsconfig) {
	const tmp = `${output}/__package_types_tmp__`;
	fs.rmSync(tmp, { force: true, recursive: true });
	fs.mkdirSync(tmp, { recursive: true });

	const require = createRequire(import.meta.url);
	const pkg = load_pkg_json(cwd);
	const svelte_dep = pkg.peerDependencies?.svelte || pkg.dependencies?.svelte || '3.0';
	let no_svelte_3;
	try {
		no_svelte_3 = !semver.intersects(svelte_dep, '^3.0.0');
	} catch {
		// Not all version specs are valid semver, e.g. "latest" or "next" or catalog references
		no_svelte_3 = true;
	}
	await emitDts({
		libRoot: input,
		svelteShimsPath: no_svelte_3
			? require.resolve('svelte2tsx/svelte-shims-v4.d.ts')
			: require.resolve('svelte2tsx/svelte-shims.d.ts'),
		declarationDir: tmp,
		tsconfig
	});

	const handwritten = new Set();

	// skip files that conflict with hand-written .d.ts
	for (const file of files) {
		if (file.name.endsWith('.d.ts')) {
			handwritten.add(file.name);
		}
	}

	// resolve $lib alias (TODO others), copy into package dir
	for (const file of walk(tmp)) {
		if (handwritten.has(file)) {
			console.warn(`Using $lib/${file} instead of generated .d.ts file`);
		}

		let source = fs.readFileSync(path.join(tmp, file), 'utf8');
		if (file.endsWith('.d.ts.map')) {
			// Because we put the .d.ts files in a temporary directory, the relative path needs to be adjusted
			const parsed = JSON.parse(source);
			if (parsed.sources) {
				parsed.sources = /** @type {string[]} */ (parsed.sources).map((source) =>
					posixify(
						path.join(
							path.relative(
								path.dirname(path.join(final_output, file)),
								path.dirname(path.join(input, file))
							),
							path.basename(source)
						)
					)
				);
				source = JSON.stringify(parsed);
			}
		} else {
			source = resolve_aliases(input, file, source, alias);
		}
		write(path.join(output, file), source);
	}

	fs.rmSync(tmp, { force: true, recursive: true });
}

/**
 * TS -> JS
 *
 * @param {string | undefined} tsconfig
 * @param {string} filename
 * @param {string} source
 * @param {Map<string, import('typescript').CompilerOptions>} cache
 */
export async function transpile_ts(tsconfig, filename, source, cache) {
	const ts = await try_load_ts();
	const options = await load_tsconfig(tsconfig, filename, cache, ts);
	const transformers = options.rewriteRelativeImportExtensions
		? { before: [rewrite_import_meta_glob_extensions(ts)] }
		: undefined;

	// transpileModule treats NodeNext as CommonJS because it doesn't read the package.json. Therefore we need to override it.
	// Also see https://github.com/microsoft/TypeScript/issues/53022 (the filename workaround doesn't work).
	return ts.transpileModule(source, {
		compilerOptions: {
			...options,
			module: ts.ModuleKind.ESNext,
			moduleResolution: ts.ModuleResolutionKind.NodeNext
		},
		fileName: filename,
		transformers
	}).outputText;
}

/**
 * Rewrite relative TypeScript glob patterns because `svelte-package` emits
 * TypeScript modules as JavaScript.
 *
 * @param {typeof import('typescript')} ts
 * @returns {import('typescript').TransformerFactory<import('typescript').SourceFile>}
 */
function rewrite_import_meta_glob_extensions(ts) {
	return (context) => {
		/** @param {import('typescript').Node} node */
		const visit = (node) => {
			if (!ts.isCallExpression(node) || !is_import_meta_glob(ts, node)) {
				return ts.visitEachChild(node, visit, context);
			}

			const [patterns, ...rest] = node.arguments;
			const rewritten = rewrite_glob_patterns(ts, patterns);

			if (!rewritten || rewritten === patterns) {
				return ts.visitEachChild(node, visit, context);
			}

			return ts.visitEachChild(
				ts.factory.updateCallExpression(node, node.expression, node.typeArguments, [
					rewritten,
					...rest
				]),
				visit,
				context
			);
		};

		return (source_file) => ts.visitEachChild(source_file, visit, context);
	};
}

/**
 * @param {typeof import('typescript')} ts
 * @param {import('typescript').CallExpression} call
 */
function is_import_meta_glob(ts, call) {
	const expression = call.expression;
	return (
		!call.questionDotToken &&
		ts.isPropertyAccessExpression(expression) &&
		!expression.questionDotToken &&
		expression.name.text === 'glob' &&
		ts.isMetaProperty(expression.expression) &&
		expression.expression.keywordToken === ts.SyntaxKind.ImportKeyword &&
		expression.expression.name.text === 'meta'
	);
}

/**
 * @param {typeof import('typescript')} ts
 * @param {import('typescript').Expression | undefined} patterns
 * @returns {import('typescript').Expression | undefined}
 */
function rewrite_glob_patterns(ts, patterns) {
	if (!patterns) return patterns;

	if (ts.isStringLiteralLike(patterns)) {
		return rewrite_glob_pattern(ts, patterns);
	}

	if (!ts.isArrayLiteralExpression(patterns)) return patterns;
	if (!patterns.elements.every((element) => ts.isStringLiteralLike(element))) return patterns;

	const elements = patterns.elements.map((element) =>
		rewrite_glob_pattern(ts, /** @type {import('typescript').StringLiteralLike} */ (element))
	);

	if (elements.every((element, index) => element === patterns.elements[index])) return patterns;

	return ts.factory.updateArrayLiteralExpression(patterns, elements);
}

/**
 * @param {typeof import('typescript')} ts
 * @param {import('typescript').StringLiteralLike} pattern
 */
function rewrite_glob_pattern(ts, pattern) {
	const path = pattern.text.startsWith('!') ? pattern.text.slice(1) : pattern.text;

	if (!(path.startsWith('./') || path.startsWith('../')) || !path.endsWith('.ts')) {
		return pattern;
	}

	const rewritten = pattern.text.slice(0, -3) + '.js';
	const literal = ts.isStringLiteral(pattern)
		? ts.factory.createStringLiteral(rewritten, pattern.getText().startsWith("'"))
		: ts.factory.createNoSubstitutionTemplateLiteral(rewritten);

	return ts.setTextRange(literal, pattern);
}

async function try_load_ts() {
	try {
		return (await import('typescript')).default;
	} catch {
		throw new Error(
			'You need to install TypeScript if you want to transpile TypeScript files and/or generate type definitions'
		);
	}
}

/**
 * @param {string | undefined} tsconfig
 * @param {string} filename
 * @param {Map<string, import('typescript').CompilerOptions>} cache
 * @param {typeof import('typescript')} [ts]
 */
export async function load_tsconfig(tsconfig, filename, cache, ts) {
	if (!ts) {
		ts = await try_load_ts();
	}

	let config_filename;
	/** @type {string[]} */
	const traversed_dirs = [];

	if (tsconfig) {
		if (fs.existsSync(tsconfig)) {
			config_filename = tsconfig;

			const cached = cache.get(config_filename);
			if (cached) {
				return cached;
			} else {
				// This isn't really a dir, but it simplifies the caching logic
				traversed_dirs.push(config_filename);
			}
		} else {
			throw new Error('Failed to locate provided tsconfig or jsconfig');
		}
	} else {
		// ts.findConfigFile is broken (it will favour a distant tsconfig
		// over a near jsconfig, and then only when you call it twice)
		// so we implement it ourselves
		let dir = filename;
		while (dir !== (dir = path.dirname(dir))) {
			const cached = cache.get(dir);
			if (cached) {
				for (const traversed of traversed_dirs) {
					cache.set(traversed, cached);
				}
				return cached;
			}

			traversed_dirs.push(dir);

			const tsconfig = path.join(dir, 'tsconfig.json');
			const jsconfig = path.join(dir, 'jsconfig.json');

			if (fs.existsSync(tsconfig)) {
				config_filename = tsconfig;
				break;
			}

			if (fs.existsSync(jsconfig)) {
				config_filename = jsconfig;
				break;
			}
		}
	}

	if (!config_filename) {
		throw new Error('Failed to locate tsconfig or jsconfig');
	}

	const { error, config } = ts.readConfigFile(config_filename, ts.sys.readFile);

	if (error) {
		throw new Error('Malformed tsconfig\n' + JSON.stringify(error, null, 2));
	}

	// Do this so TS will not search for initial files which might take a while
	config.include = [];
	config.files = [];
	const { options } = ts.parseJsonConfigFileContent(
		config,
		ts.sys,
		path.dirname(config_filename),
		{ sourceMap: false },
		config_filename
	);

	for (const dir of traversed_dirs) {
		cache.set(dir, options);
	}

	return options;
}
