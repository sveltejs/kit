// TODO hardcoding the relative location makes this brittle
// @ts-ignore
import { init, render } from '../output/server/app.js';
// @ts-ignore
import { path, host, port } from './env.js';
import { createServer } from './server';

init();

const instance = createServer({ render });

const listenOpts = { path, host, port };
instance.listen(listenOpts, () => {
	console.log(`Listening on ${path ? path : host + ':' + port}`);
});

export { instance };
