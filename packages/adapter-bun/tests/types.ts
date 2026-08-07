import adapter from '../index.js';

adapter({
	buildOptions: {
		compile: { target: 'bun-linux-x64' },
		minify: true,
		bytecode: true
	}
});

adapter({
	buildOptions: {
		compile: false
	}
});

adapter({
	buildOptions: {
		compile: true,
		// @ts-expect-error the adapter reserves the Bun runtime target
		target: 'node'
	}
});
