import { add } from 'e2e-test-dep-wasm';

export async function GET() {
	return new Response(String(await add(1, 2)));
}
