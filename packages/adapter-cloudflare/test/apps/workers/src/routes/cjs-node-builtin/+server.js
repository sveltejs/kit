import { token } from 'cjs-dep';

export function GET() {
	return new Response(token());
}
