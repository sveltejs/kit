import adapter from '../index.js';

adapter();

adapter({
	out: 'dist',
	envPrefix: 'APP_',
	serverOptions: {
		development: false,
		hostname: '127.0.0.1',
		port: 4000,
		idleTimeout: 30,
		maxRequestBodySize: 1024,
		reusePort: true,
		ipv6Only: false
	},
	buildOptions: {
		compile: { outfile: 'application', target: 'bun-linux-x64' },
		minify: true,
		bytecode: true,
		sourcemap: 'linked',
		drop: ['debugger']
	}
});

adapter({
	serverOptions: { unix: '/tmp/application.sock' },
	buildOptions: { compile: false }
});

adapter({
	buildOptions: {
		compile: true,
		// @ts-expect-error the adapter reserves the top-level runtime target
		target: 'node'
	}
});

adapter({
	serverOptions: {
		// @ts-expect-error the generated server owns its fetch handler
		fetch: () => new Response('custom')
	}
});
