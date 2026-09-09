import { message } from 'server-side-dep';

export function GET() {
	return new Response(message());
}
