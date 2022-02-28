import fs from 'fs';
import path from 'path';
import colors from 'kleur';
import { mkdirp } from '../utils/filesystem.js';
import { SVELTE_KIT } from './constants.js';

/** @param {string} file */
const exists = (file) => fs.existsSync(file) && file;

/** @param {import('types').ValidatedConfig} config */
export function generate_tsconfig(config) {
	const out = path.resolve(SVELTE_KIT, 'tsconfig.json');
	const user_file = exists('tsconfig.json') || exists('jsconfig.json');

	if (user_file) validate(config, out, user_file);

	mkdirp(SVELTE_KIT);

	/** @param {string} file */
	const project_relative = (file) => path.relative('.', file);

	/** @param {string} file */
	const config_relative = (file) => path.relative(SVELTE_KIT, file);

	fs.writeFileSync(
		`${SVELTE_KIT}/tsconfig.json`,
		JSON.stringify(
			{
				compilerOptions: {
					moduleResolution: 'node',
					module: 'es2020',
					lib: ['es2020', 'DOM'],
					target: 'es2020',
					// svelte-preprocess cannot figure out whether you have a value or a type, so tell TypeScript
					// to enforce using \`import type\` instead of \`import\` for Types.
					importsNotUsedAsValues: 'error',
					// TypeScript doesn't know about import usages in the template because it only sees the
					// script of a Svelte file. Therefore preserve all value imports. Requires TS 4.5 or higher.
					preserveValueImports: true,
					isolatedModules: true,
					resolveJsonModule: true,
					// To have warnings/errors of the Svelte compiler at the correct position,
					// enable source maps by default.
					sourceMap: true,
					esModuleInterop: true,
					skipLibCheck: true,
					forceConsistentCasingInFileNames: true,
					baseUrl: config_relative('.'),
					allowJs: true,
					checkJs: true,
					paths: {
						$lib: [project_relative(config.kit.files.lib)],
						'$lib/*': [project_relative(config.kit.files.lib + '/*')]
					},
					rootDirs: [config_relative('.'), './types']
				},
				include: ['src/**/*.d.ts', 'src/**/*.js', 'src/**/*.ts', 'src/**/*.svelte'].map(
					config_relative
				),
				exclude: [config_relative('node_modules/**'), `./**`]
			},
			null,
			'\t'
		)
	);
}

/**
 * @param {import('types').ValidatedConfig} config
 * @param {string} out
 * @param {string} user_file
 */
function validate(config, out, user_file) {
	// we have to eval the file, since it's not parseable as JSON (contains comments)
	const user_tsconfig_json = fs.readFileSync(user_file, 'utf-8');
	const user_tsconfig = (0, eval)(`(${user_tsconfig_json})`);

	// we need to check that the user's tsconfig extends the framework config
	const extend = user_tsconfig.extends;
	const extends_framework_config = extend && path.resolve('.', extend) === out;

	if (extends_framework_config) {
		const { paths: user_paths } = user_tsconfig.compilerOptions || {};

		if (user_paths) {
			const lib = user_paths['$lib'] || [];
			const lib_ = user_paths['$lib/*'] || [];

			const missing_lib_paths =
				!lib.some(
					(/** @type {string} */ relative) => path.resolve('.', relative) === config.kit.files.lib
				) ||
				!lib_.some(
					(/** @type {string} */ relative) =>
						path.resolve('.', relative) === config.kit.files.lib + '/*'
				);

			if (missing_lib_paths) {
				console.warn(
					colors
						.bold()
						.yellow(`Your compilerOptions.paths in ${user_file} should include the following:`)
				);
				const relative = path.relative('.', config.kit.files.lib);
				console.warn(`{\n  "$lib":["${relative}"],\n  "$lib/*":["${relative}/*"]\n}`);
			}
		}
	} else {
		let relative = path.relative('.', out);
		if (relative.startsWith(SVELTE_KIT)) relative = './' + relative;

		console.warn(
			colors
				.bold()
				.yellow(`Your ${user_file} should extend the configuration generated by SvelteKit:`)
		);
		console.warn(`{\n  "extends": "${relative}"\n}`);
	}
}
