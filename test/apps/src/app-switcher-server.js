const app_starter = require('./app-starter');

const http = require('http');

const hostname = '127.0.0.1';
const port = 3003;

let server;
let current_app;

/**
 * Starts a web server exposing an endpoint for starting a Svelte dev server running a specified app.
 */
function start() {
	return new Promise((resolve, reject) => {
		server = http.createServer(async (req, res) => {
			res.setHeader('Access-Control-Allow-Origin', '*');
			res.setHeader('Content-Type', 'application/json');

			const [command, arg] = req.url.slice(1).split('/');

			if (command === 'start') {
				const app_name = arg;

				if (current_app === app_name) {
					res.statusCode = 200;
					res.end(JSON.stringify({ result: 'ok', status: 'already-running' }));

					return;
				}

				console.log(`Switching to application ${app_name}...`);

				await app_starter.start(app_name);

				console.log('Done switching.');

				current_app = app_name;

				res.statusCode = 200;
				res.end(JSON.stringify({ result: 'ok', app: app_name }));
			} else {
				res.statusCode = 404;
			}
		});

		server.listen(port, hostname, () => {
			console.log(`App switcher server running at http://${hostname}:${port}/`);

			resolve();
		});

		server.on('close', reject);
	});
}

async function stop() {
	await new Promise(resolve => server.close(resolve));

	return app_starter.stop();
}

module.exports = { start, stop };
