// TODO hardcoding the relative location makes this brittle
import { init, render } from '../output/server/app.js'; // eslint-disable-line import/no-unresolved
import { path, host, port } from './env.js'; // eslint-disable-line import/no-unresolved
import { createServer } from './server';

init();

const instance = createServer({ render });

const listenOpts = { path, host, port };
instance.listen(listenOpts, () => {
	console.log(`Listening on ${path ? path : host + ':' + port}`);
});

export { instance };
