// this file helps test that svelte packages are correctly bundled
import { message } from 'server-side-svelte-dep';

export function GET() {
	return new Response(message());
}
