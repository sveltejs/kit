import * as path from 'path';
import { createRequire } from 'module';

/**
 * @param {import('types').ValidatedConfig} config
 * @param {string} out
 */
export async function emit_dts(config, out) {
	const require = createRequire(import.meta.url);
	const emit = await try_load_svelte2tsx();
	await emit({
		libRoot: config.kit.files.lib,
		svelteShimsPath: require.resolve('svelte2tsx/svelte-shims.d.ts'),
		declarationDir: out
	});
}

async function try_load_svelte2tsx() {
	const svelte2tsx = await load();
	const emit_dts = svelte2tsx.emitDts;
	if (!emit_dts) {
		throw new Error(
			'You need to install svelte2tsx >=0.4.1 if you want to generate type definitions'
		);
	}
	return emit_dts;

	async function load() {
		try {
			return await import('svelte2tsx');
		} catch (e) {
			throw new Error(
				'You need svelte2tsx and typescript if you want to generate type definitions. Install it through your package manager, or disable generation which is highly discouraged. See https://kit.svelte.dev/docs/packaging'
			);
		}
	}
}

/**
 * @param {string} filename
 * @param {string} source
 */
export async function transpile_ts(filename, source) {
	const ts = await try_load_ts();
	return ts.transpileModule(source, {
		compilerOptions: load_tsconfig(filename, ts),
		fileName: filename
	}).outputText;
}

async function try_load_ts() {
	try {
		return (await import('typescript')).default;
	} catch (e) {
		throw new Error(
			'You need to install TypeScript if you want to transpile TypeScript files and/or generate type definitions'
		);
	}
}

/**
 * @param {string} filename
 * @param {import('typescript')} ts
 */
function load_tsconfig(filename, ts) {
	const filedir = path.dirname(filename);
	const tsconfig_filename = ts.findConfigFile(filedir, ts.sys.fileExists);

	if (!tsconfig_filename) {
		throw new Error('Failed to locate tsconfig or jsconfig');
	}

	const { error, config } = ts.readConfigFile(tsconfig_filename, ts.sys.readFile);

	if (error) {
		throw new Error('Malformed tsconfig\n' + JSON.stringify(error, null, 2));
	}

	// Do this so TS will not search for initial files which might take a while
	config.include = [];
	config.files = [];
	const { options } = ts.parseJsonConfigFileContent(
		config,
		ts.sys,
		path.dirname(tsconfig_filename),
		{ sourceMap: false },
		tsconfig_filename
	);
	return options;
}
