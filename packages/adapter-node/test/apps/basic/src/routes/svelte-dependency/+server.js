import { message } from 'server-side-svelte-dep';

export function GET() {
	return new Response(message());
}
