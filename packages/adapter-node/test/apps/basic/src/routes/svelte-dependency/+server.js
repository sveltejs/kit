import { message } from 'server-side-svelte-dep/server/message';

export function GET() {
	return new Response(message());
}
