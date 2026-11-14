import { DurableObject } from 'cloudflare:workers';
import { fetch as sveltekit } from '@sveltejs/adapter-cloudflare/worker';
import { Marker, state } from './lib/state.js';

state.marker = new Marker();

export class Counter extends DurableObject {
	async increment(): Promise<number> {
		const count = ((await this.ctx.storage.get<number>('count')) ?? 0) + 1;
		await this.ctx.storage.put('count', count);
		return count;
	}
}

export default {
	async fetch(request: Request, env: unknown, ctx: unknown): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === '/worker') {
			return new Response('from the custom Worker');
		}

		state.worker_requests += 1;

		const response = await sveltekit(request, env, ctx);

		const headers = new Headers(response.headers);
		headers.set('x-custom-worker', 'true');

		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers
		});
	}
};
