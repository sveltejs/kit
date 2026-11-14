import { read } from '$app/server';
// not inlined, so that read reads it from the server
import logo from '../logo.svg?no-inline';

export function GET() {
	return new Response(read(logo).headers.get('content-length'));
}
