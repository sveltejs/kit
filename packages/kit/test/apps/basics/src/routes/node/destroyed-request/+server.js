import { once } from 'node:events';
import { IncomingMessage } from 'node:http';
import { Socket } from 'node:net';
import { getRequest } from '@sveltejs/kit/node';

export async function GET() {
	const incoming = new IncomingMessage(new Socket());
	incoming.method = 'POST';
	incoming.url = '/example';
	incoming.httpVersionMajor = 1;
	incoming.headers = { 'content-type': 'application/json', 'content-length': '2' };

	const closed = once(incoming, 'close');
	incoming.destroy();
	await closed;

	const request = getRequest({ request: incoming, base: 'http://localhost' });

	return Response.json({
		aborted: request.signal.aborted,
		body: await request.text()
	});
}
