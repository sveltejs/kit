export const gate = true;

/** @type {import('./$types').LayoutLoad} */
export async function load() {
	await new Promise((r) => setTimeout(r, 20));
	return { layout_seq: 1 };
}
