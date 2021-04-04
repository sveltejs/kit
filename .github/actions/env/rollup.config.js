import resolve from '@rollup/plugin-node-resolve';
import cjs from '@rollup/plugin-commonjs';

export default [
	{
		plugins: [cjs(), resolve()],
		input: 'main.js',
		output: [
			{
				file: 'action/main.js',
				format: 'cjs',
				sourcemap: false
			}
		]
	}
];
