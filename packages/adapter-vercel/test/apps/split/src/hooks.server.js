import text from '$lib/hooks.server.js.txt';

export async function handle({ event, resolve }) {
	event.setHeaders({ 'x-server-asset': text });
	return resolve(event);
}
