import { createServer } from './server';
/*eslint import/no-unresolved: [2, { ignore: ['\.\/app\.js$'] }]*/
import * as app from './app.js';

const { PORT = 3000 } = process.env; // TODO configure via svelte.config.js

const instance = createServer({ render: app.render }).listen(PORT, (err) => {
	if (err) {
		console.log('error', err);
	} else {
		console.log(`Listening on port ${PORT}`);
	}
});

export { instance };
