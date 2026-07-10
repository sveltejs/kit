// Boots the adapter-node build output with an instrumentation file present and
// asserts that (1) the server starts at all — regression for the env-init facade
// resolving `set_env` from the adapter's own `env.js` (sveltejs/kit#16303),
// and (2) a module-scope `$app/env/private` read observes the runtime value —
// regression for sveltejs/kit#16288.
import { spawn } from 'node:child_process';
import process from 'node:process';

const PORT = 3399;
const EXPECTED = 'https://api.example';

const server = spawn(process.execPath, ['build/index.js'], {
	env: {
		...process.env,
		MY_BASE_URL: EXPECTED,
		PORT: String(PORT),
		HOST: '127.0.0.1'
	},
	stdio: ['ignore', 'pipe', 'pipe']
});

let output = '';
server.stdout.on('data', (chunk) => (output += chunk));
server.stderr.on('data', (chunk) => (output += chunk));

let exited = false;
server.on('exit', () => (exited = true));

function fail(message) {
	console.error(`FAIL: ${message}`);
	console.error('--- server output ---');
	console.error(output || '(none)');
	server.kill();
	process.exit(1);
}

try {
	let response;
	for (let attempt = 0; attempt < 40; attempt++) {
		if (exited) fail('server exited before responding (startup crash)');
		await new Promise((resolve) => setTimeout(resolve, 250));
		try {
			response = await fetch(`http://127.0.0.1:${PORT}/env`);
			break;
		} catch {
			// not up yet
		}
	}
	if (!response) fail('server never came up');

	const { captured, live } = await response.json();
	if (live !== EXPECTED)
		fail(`live env read is ${JSON.stringify(live)}, expected ${JSON.stringify(EXPECTED)}`);
	if (captured !== EXPECTED) {
		fail(
			`module-scope $app/env/private read captured ${JSON.stringify(captured)} — evaluated before env was set`
		);
	}
	console.log(
		'PASS: server booted with instrumentation and module-scope env read observed the runtime value'
	);
	server.kill();
	process.exit(0);
} catch (error) {
	fail(error.message);
}
