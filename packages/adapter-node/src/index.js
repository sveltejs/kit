import { createServer } from './server';
/*eslint import/no-unresolved: [2, { ignore: ['\.\/app\.js$'] }]*/
import * as app from './app.js';

const { HOST = '0.0.0.0', PORT = 3000 } = process.env;

const instance = createServer({ render: app.render }).listen(PORT, HOST, () => {
	console.log(`Listening on port ${PORT}`);
});

export { instance };
