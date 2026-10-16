import init from './empty.wasm?init';

export async function GET() {
	const instance = await init();
	return Response.json(Object.keys(instance.exports));
}
