import module from './add.wasm';

const { exports } = new WebAssembly.Instance(module);

export function GET() {
	const add = /** @type {(a: number, b: number) => number} */ (exports.add);
	return new Response(String(add(1, 2)));
}
