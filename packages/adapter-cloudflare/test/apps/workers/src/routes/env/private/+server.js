import { FOO } from '$app/env/private';

export function GET() {
	return new Response(FOO);
}
