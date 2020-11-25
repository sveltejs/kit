import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import sucrase from '@rollup/plugin-sucrase';
import pkg from './package.json';
import { readFileSync, writeFileSync } from 'fs';

const external = [].concat(
	Object.keys(pkg.dependencies || {}),
	Object.keys(process.binding('natives')),
	resolve('snowpack/pkg')
);

export default [
	{
		input: {
			navigation: 'src/runtime/navigation/index.ts',
			stores: 'src/runtime/stores/index.ts'
		},
		output: {
			dir: 'assets/runtime',
			format: 'esm',
			sourcemap: true,
			paths: {
				ROOT: '../generated/root.svelte',
				MANIFEST: '../generated/manifest.js'
			}
		},
		external: ['svelte', 'svelte/store', 'ROOT', 'MANIFEST'],
		plugins: [
			resolve({
				extensions: ['.mjs', '.js', '.ts']
			}),
			sucrase({
				transforms: ['typescript']
			})
			/*typescript({
				tsconfigDefaults: {
					compilerOptions: {
						// create typings. these options do not apply to the other build target
						declaration: true,
						emitDeclarationOnly: true,
						outFile: './index.js'
					}
				},
				useTsconfigDeclarationDir: true
			}),
			{
				name: 'adjust-typings',
				resolveId: () => null,
				load: () => null,
				writeBundle: adjust_typings
			}*/
		]
	},

	{
		input: [`src/cli.ts`],
		output: {
			dir: 'dist',
			format: 'cjs',
			sourcemap: true,
			chunkFileNames: '[name].js'
		},
		external: (id) => {
			if (id.includes('snowpack/snowpack')) return true;
			return external.includes(id);
		},
		plugins: [
			json(),
			resolve({
				extensions: ['.mjs', '.js', '.ts']
			}),
			commonjs(),
			sucrase({
				transforms: ['typescript']
			})
			//typescript()
		],
		preserveEntrySignatures: false
	}
];

/**
 * Remove the typings that do not refer to the runtime and fix the module names
 * (e.g. change "src/runtime/navigation/goto/index" to "$app/navigation/goto")
 */
function adjust_typings() {
	const alias = '$app';

	const typings_file = 'index.d.ts';

	const only_runtime = (code) =>
		Array.from(code.matchAll(/declare module "src\/runtime\/.*?\n}/gms))
			.map((m) => m[0])
			.join('\n\n');

	const code = only_runtime(readFileSync(typings_file, 'utf8')).replace(
		/ (module|from) ['"]src\/runtime\/(.+?)(\/index)?['"]/g,
		` $1 "${alias}/$2"`
	);

	writeFileSync(typings_file, code);
}
