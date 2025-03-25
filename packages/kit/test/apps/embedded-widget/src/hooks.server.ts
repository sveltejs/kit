import type { Handle } from '@sveltejs/kit';
import * as fs from 'node:fs';

export const handle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname.startsWith('/third-party')) {
		// simulate a third party page
		const filePath = 'src/third-party.html';
		// replace the embed script port to use the same port as the current request
		const content = fs.readFileSync(filePath, 'utf-8').replace('__PORT__', event.url.port);
		return new Response(content, {
			headers: {
				'Content-Type': 'text/html',
				'Cache-Control': 'no-store'
			}
		});
	}

	return resolve(event);
};
