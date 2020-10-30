import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import pkg from './package.json';

const input = {};
Object.keys(pkg.exports).forEach(key => {
	input[key.replace(/^\.\//, '')] = `src/${key}/index.ts`;
});

export default {
	input,
	output: [
		{
			dir: '.',
			entryFileNames: '[name]/index.js',
			chunkFileNames: 'common/[name].js',
			format: 'cjs',
			sourcemap: true
		},
		{
			dir: '.',
			entryFileNames: '[name]/index.mjs',
			chunkFileNames: 'common/[name].mjs',
			format: 'esm',
			sourcemap: true
		}
	],
	plugins: [
		nodeResolve(),
		typescript()
	],
	external: [
		...require('module').builtinModules,
		...Object.keys(pkg.dependencies)
	]
};
