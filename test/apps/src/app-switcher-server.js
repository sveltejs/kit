const app_starter = require('./app-starter');

const http = require('http');

const hostname = '127.0.0.1';
const port = 3003;

let server;

/**
 * Starts a web server exposing an endpoint for starting a Svelte dev server running a specified app.
 */
function start() {
	return new Promise((resolve, reject) => {
		server = http.createServer(async (req, res) => {
			const [command, arg] = req.url.slice(1).split('/');

			if (command === 'start') {
				const test_name = arg;

				if (app_starter.is_running()) {
					await app_starter.stop();
				}

				console.log(`Switching to application ${test_name}...`);

				await app_starter.start(test_name);

				res.statusCode = 200;

				res.setHeader('Access-Control-Allow-Origin', '*');
				res.setHeader('Content-Type', 'application/json');

				res.end(JSON.stringify({ result: 'ok', app: test_name }));
			} else {
				res.statusCode = 404;
			}
		});

		server.listen(port, hostname, () => {
			console.log(`Server running at http://${hostname}:${port}/`);

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
