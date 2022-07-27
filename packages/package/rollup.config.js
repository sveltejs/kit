import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import resolve from '@rollup/plugin-node-resolve';
import pkg from './package.json';

const external = [].concat(
	Object.keys(pkg.dependencies || {}),
	Object.keys(pkg.peerDependencies || {}),
	Object.keys(process.binding('natives')),
	'typescript'
);

/**
 * @type {import('rollup').RollupOptions}
 */
export default {
	input: 'src/cli.js',
	output: {
		format: 'esm',
		dir: 'dist'
	},
	external: (id) => {
		return id.startsWith('node:') || external.includes(id);
	},
	plugins: [
		replace({
			preventAssignment: true,
			values: {
				__VERSION__: pkg.version
			}
		}),
		resolve({
			extensions: ['.mjs', '.js', '.ts'],
			preferBuiltins: true
		}),
		commonjs()
	],
	preserveEntrySignatures: true
};
