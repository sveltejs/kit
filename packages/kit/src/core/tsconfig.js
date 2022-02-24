import fs from 'fs';
import path from 'path';
import { mkdirp } from '../utils/filesystem.js';
import { SVELTE_KIT } from './constants.js';

/** @param {string} file */
const exists = (file) => fs.existsSync(file) && file;

/** @param {import('types').ValidatedConfig} config */
export function generate_tsconfig(config) {
	const out = path.resolve(SVELTE_KIT, 'tsconfig.json');

	const user_file = exists('tsconfig.json') || exists('jsconfig.json');

	const paths = {};

	paths['$lib'] = [path.relative(SVELTE_KIT, config.kit.files.lib)];
	paths['$lib/*'] = [path.relative(SVELTE_KIT, config.kit.files.lib) + '/*'];

	if (user_file) {
		const user_tsconfig = JSON.parse(fs.readFileSync(user_file, 'utf-8'));

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
						`\u001B[1m\u001B[93mYour compilerOptions.paths in ${user_file} should include the following:\u001B[39m\u001B[22m`
					);
					const relative = path.relative('.', config.kit.files.lib);
					console.warn(`{\n  "$lib":["${relative}"],\n  "$lib/*":["${relative}/*"]\n}`);
				}
			}
		} else {
			let relative = path.relative('.', out);
			if (relative.startsWith(SVELTE_KIT)) relative = './' + relative;

			console.warn(
				`\u001B[1m\u001B[93mYour ${user_file} should include the following:\u001B[39m\u001B[22m`
			);
			console.warn(`"extends": "${relative}"`);
		}
	}

	mkdirp(SVELTE_KIT);

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
					baseUrl: path.relative(SVELTE_KIT, '.'),
					allowJs: true,
					checkJs: true,
					paths
				},
				include: ['../**/*.d.ts', '../**/*.js', '../**/*.ts', '../**/*.svelte'],
				exclude: ['../node_modules/**']
			},
			null,
			'\t'
		)
	);
}
