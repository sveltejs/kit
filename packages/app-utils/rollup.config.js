import { nodeResolve } from '@rollup/plugin-node-resolve';
import pkg from './package.json';

const input = {};
Object.keys(pkg.exports).forEach((key) => {
	input[key.replace(/^\.\//, '')] = `src/${key}/index.js`;
});

export default {
	input,
	output: {
		dir: '.',
		entryFileNames: '[name]/index.js',
		chunkFileNames: 'common/[name].js',
		format: 'esm',
		sourcemap: true
	},
	plugins: [nodeResolve()],
	external: [...require('module').builtinModules, ...Object.keys(pkg.dependencies)]
};
