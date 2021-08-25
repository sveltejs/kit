import { init, render } from '@sveltejs/kit/adapter';
import { host, path, port } from './env.js';
import { createServer } from './server';

init();

const instance = createServer({ render });

const listenOpts = { path, host, port };
instance.listen(listenOpts, () => {
	console.log(`Listening on ${path ? path : host + ':' + port}`);
});

export { instance };
