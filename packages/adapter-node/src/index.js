import { existsSync } from 'node:fs';
import { join } from 'node:path';

const dirname = new URL('.', import.meta.url).pathname;

const instrumentFile = join(dirname, 'server', 'instrument.server.js');

if (existsSync(instrumentFile)) {
	import(instrumentFile)
		.catch((err) => {
			console.error('Failed to import instrument.server.js', err);
		})
		.finally(() => {
			tryImportStart();
		});
} else {
	tryImportStart();
}

function tryImportStart() {
	import('./start.js').catch((err) => {
		console.error('Failed to import server (start.js)', err);
	});
}
