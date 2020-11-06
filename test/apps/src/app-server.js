const fs = require('fs');

const properties = ['name', 'message', 'stack', 'code', 'lineNumber', 'fileName'];

/**
 * Starts a Kit dev server running the app in the current directory.
 */
async function start_app_server() {
  const { dev } = require('@sveltejs/kit/dist/cli');

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

    send_error(new Error(data));
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

  process.stdout.write = process.stderr.write = log.write.bind(log);
}

function send(message) {
	process.send && process.send(message);
}

function send_error(error) {
	send({
		__kit__: true,
		event: 'error',
		error: properties.reduce((object, key) => ({...object, [key]: error[key]}), {})
	});
}

process.on('unhandledRejection', (reason, p) => {
	send_error(reason);
});

process.on('uncaughtException', err => {
	send_error(err);
	process.exitCode = 1;
});

start_app_server();
