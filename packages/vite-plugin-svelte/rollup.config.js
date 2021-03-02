import typescript from '@rollup/plugin-typescript';
import pkg from './package.json';

const external = [].concat(
	Object.keys(pkg.dependencies || {}),
	Object.keys(pkg.peerDependencies || {}),
	Object.keys(process.binding('natives')),
	'svelte/compiler'
);

export default {
	input: 'src/index.ts',
	output: {
		file: 'index.js',
		format: 'cjs',
		exports: 'default'
	},
	plugins: [typescript()],
	external
};
