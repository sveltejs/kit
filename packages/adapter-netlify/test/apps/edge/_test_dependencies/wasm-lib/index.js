// imports a .wasm file directly, like resvg/satori-based packages
/**
 * @param {number} a
 * @param {number} b
 * @returns {Promise<number>}
 */
export async function add(a, b) {
	const wasm = await import('./add.wasm');
	return wasm.add(a, b);
}
