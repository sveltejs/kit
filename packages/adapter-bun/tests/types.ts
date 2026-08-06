import adapter from '../index.js';

adapter({
	compile: {
		compile: { target: 'bun-linux-x64' },
		minify: true,
		bytecode: true
	}
});

adapter({
	compile: {
		// @ts-expect-error false does not compile an executable
		compile: false
	}
});

adapter({
	compile: {
		compile: true,
		// @ts-expect-error the adapter reserves the Bun runtime target
		target: 'node'
	}
});
