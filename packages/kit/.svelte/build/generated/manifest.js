import * as layout from "../components/layout.svelte";

const components = [
	() => import("../../../test/apps/amp/src/routes/invalid/index.svelte"),
	() => import("../../../test/apps/amp/src/routes/valid/index.svelte")
];

const d = decodeURIComponent;
const empty = () => ({});

export const pages = [
	{
		// test/apps/amp/src/routes/invalid/index.svelte
		pattern: /^\/invalid\/?$/,
		params: empty,
		parts: [components[0]]
	},

	{
		// test/apps/amp/src/routes/valid/index.svelte
		pattern: /^\/valid\/?$/,
		params: empty,
		parts: [components[1]]
	}
];

export const ignore = [
	/^\/valid\.json$/
];

export { layout };