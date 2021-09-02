import app from '@sveltejs/kit/app';
import { host, path, port } from './env.js';
import { createServer } from './server';

app.init();

const instance = createServer(app);

const listenOpts = { path, host, port };
instance.listen(listenOpts, () => {
	console.log(`Listening on ${path ? path : host + ':' + port}`);
});

export { instance };
