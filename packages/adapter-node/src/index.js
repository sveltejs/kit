// TODO hardcoding the relative location makes this brittle
import { init, render } from '../../output/server/app.js'; // eslint-disable-line import/no-unresolved
import { host, port } from './env.js'; // eslint-disable-line import/no-unresolved
import { createServer } from './server';

init();

const instance = createServer({ render }).listen(port, host, () => {
	console.log(`Listening on ${host}:${port}`);
});

export { instance };
