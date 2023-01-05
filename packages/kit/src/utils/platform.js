export function non_node_runtime() {
	return typeof globalThis.Deno !== 'undefined' || typeof globalThis.Bun !== 'undefined';
}
