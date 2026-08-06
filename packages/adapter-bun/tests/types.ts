import adapter from '../index.js';

adapter({
	serverOptions: {
		tls: {
			cert: 'certificate',
			key: ['private key'],
			requestCert: true
		}
	},
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

adapter({
	serverOptions: {
		// @ts-expect-error BunFile values cannot be serialized into the generated server
		tls: {
			cert: Bun.file('cert.pem'),
			key: 'private key'
		}
	}
});
