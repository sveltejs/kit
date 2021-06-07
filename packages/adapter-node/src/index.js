import './require_shim';
import { createServer } from './server';
// TODO hardcoding the relative location makes this brittle
import { render } from '../output/server/app.js'; // eslint-disable-line import/no-unresolved

const { HOST = '0.0.0.0', PORT = 3000 } = process.env;

const instance = createServer({ render }).listen(PORT, HOST, () => {
	console.log(`Listening on port ${PORT}`);
});

export { instance };
