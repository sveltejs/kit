import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';
import pkg from './package.json';
const fs = require('fs');
const path = require('path');

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
			chunkFileNames: 'common/[name].js',
			format: 'esm',
			sourcemap: true
		}
	],
	plugins: [
		nodeResolve(),
		typescript({ useTsconfigDeclarationDir: true }),
		{
			name: 'copy-types',
			resolveId: () => null,
			load: () => null,
			writeBundle: () => {
				copyRecursiveSync('build/types', '.');
				copyRecursiveSync('src/types', 'types');
			}
		}
	],
	external: [...require('module').builtinModules, ...Object.keys(pkg.dependencies)]
};

function copyRecursiveSync(src, dest) {
	if (fs.existsSync(src) && fs.statSync(src).isDirectory()) {
		fs.mkdirSync(dest, { recursive: true });
		fs.readdirSync(src).forEach(file =>
			copyRecursiveSync(path.join(src, file), path.join(dest, file))
		);
	} else {
		fs.copyFileSync(src, dest);
	}
}
