import cjs from 'e2e-test-dep-server';
cjs.cjs();

export function GET() {
	return new Response('ok');
}
