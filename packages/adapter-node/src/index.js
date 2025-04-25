import { existsSync } from 'node:fs';
import { join } from 'node:path';

const dirname = new URL('.', import.meta.url).pathname;

const instrumentFile = join(dirname, 'server', 'instrument.server.js');

if (existsSync(instrumentFile)) {
	import(instrumentFile).then((hooks) => {
		if (hooks?.instrument && typeof hooks.instrument === 'function') {
			hooks.instrument();
		}
		import('./start.js');
	});
} else {
	import('c');
}
