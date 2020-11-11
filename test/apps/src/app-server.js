const fs = require('fs');
const path = require('path');
const { dev, build } = require('@sveltejs/kit/dist/cli');

const properties = ['name', 'message', 'stack', 'code', 'lineNumber', 'fileName'];

/**
 * Builds the app in the current directory and starts the built server.
 */
async function start_prod_server() {
	let config;

	if (fs.existsSync('./svelte.config.js')) {
		config = JSON.parse(fs.readFileSync('./svelte.config.js'));
	} else {
		config = { adapter: '@sveltejs/adapter-node' };
	}

	try {
		const addPackageJson = !fs.existsSync('./package.json');

		if (addPackageJson) {
			fs.copyFileSync('../package.json', 'package.json');
		}

		try {
			await build(config);

			process.stderr.write = (buffer) => {
				send_stderr(buffer);
			};

			require(path.join(process.cwd(), 'build/index.js'));

			// TODO: any way to wait for the port to be taken?
			setTimeout(() => {
				send({
					__kit__: true,
					event: 'listening',
					port: 3000
				});
			}, 200);
		} finally {
			if (addPackageJson) {
				fs.unlinkSync('package.json');
			}
		}
	} catch (e) {
		send_error(e);

		console.error('Build failed: ' + e.message);
	}
}

/**
 * Starts a Kit dev server running the app in the current directory.
 */
async function start_dev_server() {
	redirect_stdout();

	const port = 3000;

	const watcher = dev({
		port
	});

	watcher.on('stdout', data => {
		process.stdout.write(data);
	});

	watcher.on('stderr', data => {
		process.stderr.write(data);

		send_stderr(data);
	});

	watcher.on('ready', async event => {
		send({
			__kit__: true,
			event: 'listening',
			port: event.port
		});
	});
}

function redirect_stdout() {
	const log = fs.createWriteStream('svelte.log');

	// snowpack spams the console; hide its stdout
	process.stdout.write = process.stderr.write = log.write.bind(log);
}

function send(message) {
	process.send && process.send(message);
}

function send_stderr(message) {
	send({
		__kit__: true,
		event: 'stderr',
		message
	});
}

function send_error(error) {
	send({
		__kit__: true,
		event: 'error',
		error: properties.reduce((object, key) => ({ ...object, [key]: error[key] }), {})
	});
}

process.on('unhandledRejection', (reason, p) => {
	send_error(reason);
});

process.on('uncaughtException', err => {
	send_error(err);
	process.exitCode = 1;
});

if (process.argv.find(arg => arg === '--prod')) {
	start_prod_server();
} else {
	start_dev_server();
}
