import { DurableObject } from 'cloudflare:workers';
import { handler } from '../../../../worker.js';

export class DO extends DurableObject {
	async fetch(_req: Request): Promise<Response> {
		// return new Response('from DO');
		const { 0: client, 1: server } = new WebSocketPair();

		this.ctx.acceptWebSocket(server);
		setInterval(() => {
			server.send(new Date().toISOString());
		}, 1000);

		return new Response(null, {
			status: 101,
			webSocket: client,
		});
	}
}

export default {
	async fetch(request, env) {
		return handler(request);
		const stub = env.DO.getByName('stub');
		return stub.fetch(request.url, request);
	},
} satisfies ExportedHandler<Cloudflare.Env>;
