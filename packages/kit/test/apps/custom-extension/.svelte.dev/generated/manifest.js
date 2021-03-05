import * as layout from "../components/layout.svelte";

const components = [
	() => import("../../src/routes/index.jesuslivesineveryone"),
	() => import("../../src/routes/unsafe-replacement.svelte"),
	() => import("../../src/routes/const.whokilledthemuffinman"),
	() => import("../../src/routes/a.svelte"),
	() => import("../../src/routes/[slug].svelte.md")
];

const d = decodeURIComponent;
const empty = () => ({});

export const pages = [
	{
		// test/apps/custom-extension/src/routes/index.jesuslivesineveryone
		pattern: /^\/$/,
		params: empty,
		parts: [components[0]]
	},

	{
		// test/apps/custom-extension/src/routes/unsafe-replacement.svelte
		pattern: /^\/unsafe-replacement\/?$/,
		params: empty,
		parts: [components[1]]
	},

	{
		// test/apps/custom-extension/src/routes/const.whokilledthemuffinman
		pattern: /^\/const\/?$/,
		params: empty,
		parts: [components[2]]
	},

	{
		// test/apps/custom-extension/src/routes/a.svelte
		pattern: /^\/a\/?$/,
		params: empty,
		parts: [components[3]]
	},

	{
		// test/apps/custom-extension/src/routes/[slug].svelte.md
		pattern: /^\/([^/]+?)\/?$/,
		params: (m) => ({ slug: d(m[1])}),
		parts: [components[4]]
	}
];

export const ignore = [
	
];

export { layout };