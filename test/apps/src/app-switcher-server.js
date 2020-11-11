const app_starter = require('./app-starter');

const http = require('http');
const url = require('url');

const hostname = '127.0.0.1';
const port = 3003;

let server;
let current_app;
// 'dev' or 'prod'
let current_mode;

/**
 * Starts a web server exposing an endpoint for starting a Svelte dev server running a specified app.
 */
function start() {
	return new Promise((resolve, reject) => {
		server = http.createServer(async (req, res) => {
			try {
				res.setHeader('Access-Control-Allow-Origin', '*');
				res.setHeader('Content-Type', 'application/json');
	
				const parsed_url = url.parse(req.url);
	
				const [command, arg] = parsed_url.pathname.slice(1).split('/');
	
				if (command === 'start') {
					const app_name = arg;	
					const query = new URLSearchParams(parsed_url.search);
					
					const mode = query.get('mode') === 'prod' ? 'prod' : 'dev';
		
					if (current_app === app_name && current_mode === mode) {
						res.statusCode = 200;
						res.end(JSON.stringify({ result: 'ok', status: 'already-running', app_name, mode }));
	
						return;
					}

					console.log(`Switching to application ${app_name} in ${mode} mode...`);
	
					await app_starter.start(app_name, mode);
	
					console.log('Done switching.');
	
					current_app = app_name;
					current_mode = mode;
	
					res.statusCode = 200;
					res.end(JSON.stringify({ result: 'ok', app_name, mode }));
				} else {
					res.statusCode = 404;
					res.end(JSON.stringify({ result: 'unknown-command', command }));
				}
			} catch (e) {
				reject(e);
				res.statusCode = 500;
				res.end(JSON.stringify({ error: e.toString(), stack: e.stack }));
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
