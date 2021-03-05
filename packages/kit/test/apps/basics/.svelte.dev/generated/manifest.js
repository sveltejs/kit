import * as layout from "../components/layout.svelte";

const components = [
	() => import("../../src/routes/content-type-header/index.svelte"),
	() => import("../../src/routes/unsafe-replacement/index.svelte"),
	() => import("../../src/routes/accessibility/$layout.svelte"),
	() => import("../../src/routes/accessibility/a.svelte"),
	() => import("../../src/routes/accessibility/b.svelte"),
	() => import("../../src/routes/nested-layout/$layout.svelte"),
	() => import("../../src/routes/nested-layout/index.svelte"),
	() => import("../../src/routes/delete-route/index.svelte"),
	() => import("../../src/routes/middleware/index.svelte"),
	() => import("../../src/routes/caching/index.svelte"),
	() => import("../../src/routes/caching/private/uses-session.svelte"),
	() => import("../../src/routes/caching/private/uses-fetch.svelte"),
	() => import("../../src/routes/routing/index.svelte"),
	() => import("../../src/routes/routing/ambiguous/[slug].svelte"),
	() => import("../../src/routes/routing/skipped/[one]/[two].svelte"),
	() => import("../../src/routes/routing/slashes/index.svelte"),
	() => import("../../src/routes/routing/client/bar/index.svelte"),
	() => import("../../src/routes/routing/client/bar/b.svelte"),
	() => import("../../src/routes/routing/client/foo.svelte"),
	() => import("../../src/routes/routing/regexp/[id([0-9]+)].svelte"),
	() => import("../../src/routes/routing/const.svelte"),
	() => import("../../src/routes/routing/dirs/bar/index.svelte"),
	() => import("../../src/routes/routing/dirs/bar/[a].svelte"),
	() => import("../../src/routes/routing/dirs/foo/index.svelte"),
	() => import("../../src/routes/routing/dirs/foo/[b].svelte"),
	() => import("../../src/routes/routing/a.svelte"),
	() => import("../../src/routes/routing/b/index.svelte"),
	() => import("../../src/routes/routing/[id([0-9]+)].svelte"),
	() => import("../../src/routes/routing/[slug].svelte"),
	() => import("../../src/routes/routing/[...rest]/deep.svelte"),
	() => import("../../src/routes/routing/[...rest]/index.svelte"),
	() => import("../../src/routes/errors/load-error-malformed-client.svelte"),
	() => import("../../src/routes/errors/load-error-malformed-server.svelte"),
	() => import("../../src/routes/errors/load-error-string-client.svelte"),
	() => import("../../src/routes/errors/load-error-string-server.svelte"),
	() => import("../../src/routes/errors/module-scope-client.svelte"),
	() => import("../../src/routes/errors/module-scope-server.svelte"),
	() => import("../../src/routes/errors/load-error-client.svelte"),
	() => import("../../src/routes/errors/load-error-server.svelte"),
	() => import("../../src/routes/errors/load-client.svelte"),
	() => import("../../src/routes/errors/load-server.svelte"),
	() => import("../../src/routes/errors/clientside.svelte"),
	() => import("../../src/routes/errors/serverside.svelte"),
	() => import("../../src/routes/errors/endpoint.svelte"),
	() => import("../../src/routes/paths/index.svelte"),
	() => import("../../src/routes/query/echo.svelte"),
	() => import("../../src/routes/store/index.svelte"),
	() => import("../../src/routes/store/navigating/$layout.svelte"),
	() => import("../../src/routes/store/navigating/a.svelte"),
	() => import("../../src/routes/store/navigating/b.svelte"),
	() => import("../../src/routes/store/result.svelte"),
	() => import("../../src/routes/host/index.svelte"),
	() => import("../../src/routes/load/index.svelte"),
	() => import("../../src/routes/load/change-detection/one/[x].svelte"),
	() => import("../../src/routes/load/change-detection/two/[y].svelte"),
	() => import("../../src/routes/load/serialization.svelte"),
	() => import("../../src/routes/load/context/$layout.svelte"),
	() => import("../../src/routes/load/context/[x]/$layout.svelte"),
	() => import("../../src/routes/load/context/[x]/[y]/$layout.svelte"),
	() => import("../../src/routes/load/context/[x]/[y]/[z].svelte"),
	() => import("../../src/routes/load/[dynamic].svelte"),
	() => import("../../src/routes/css/index.svelte")
];

const d = decodeURIComponent;
const empty = () => ({});

export const pages = [
	{
		// test/apps/basics/src/routes/content-type-header/index.svelte
		pattern: /^\/content-type-header\/?$/,
		params: empty,
		parts: [components[0]]
	},

	{
		// test/apps/basics/src/routes/unsafe-replacement/index.svelte
		pattern: /^\/unsafe-replacement\/?$/,
		params: empty,
		parts: [components[1]]
	},

	{
		// test/apps/basics/src/routes/accessibility/a.svelte
		pattern: /^\/accessibility\/a\/?$/,
		params: empty,
		parts: [components[2], components[3]]
	},

	{
		// test/apps/basics/src/routes/accessibility/b.svelte
		pattern: /^\/accessibility\/b\/?$/,
		params: empty,
		parts: [components[2], components[4]]
	},

	{
		// test/apps/basics/src/routes/nested-layout/index.svelte
		pattern: /^\/nested-layout\/?$/,
		params: empty,
		parts: [components[5], components[6]]
	},

	{
		// test/apps/basics/src/routes/delete-route/index.svelte
		pattern: /^\/delete-route\/?$/,
		params: empty,
		parts: [components[7]]
	},

	{
		// test/apps/basics/src/routes/middleware/index.svelte
		pattern: /^\/middleware\/?$/,
		params: empty,
		parts: [components[8]]
	},

	{
		// test/apps/basics/src/routes/caching/index.svelte
		pattern: /^\/caching\/?$/,
		params: empty,
		parts: [components[9]]
	},

	{
		// test/apps/basics/src/routes/caching/private/uses-session.svelte
		pattern: /^\/caching\/private\/uses-session\/?$/,
		params: empty,
		parts: [components[10]]
	},

	{
		// test/apps/basics/src/routes/caching/private/uses-fetch.svelte
		pattern: /^\/caching\/private\/uses-fetch\/?$/,
		params: empty,
		parts: [components[11]]
	},

	{
		// test/apps/basics/src/routes/routing/index.svelte
		pattern: /^\/routing\/?$/,
		params: empty,
		parts: [components[12]]
	},

	{
		// test/apps/basics/src/routes/routing/ambiguous/[slug].svelte
		pattern: /^\/routing\/ambiguous\/([^/]+?)\/?$/,
		params: (m) => ({ slug: d(m[1])}),
		parts: [components[13]]
	},

	{
		// test/apps/basics/src/routes/routing/skipped/[one]/[two].svelte
		pattern: /^\/routing\/skipped\/([^/]+?)\/([^/]+?)\/?$/,
		params: (m) => ({ one: d(m[1]), two: d(m[2])}),
		parts: [components[14]]
	},

	{
		// test/apps/basics/src/routes/routing/slashes/index.svelte
		pattern: /^\/routing\/slashes\/?$/,
		params: empty,
		parts: [components[15]]
	},

	{
		// test/apps/basics/src/routes/routing/client/bar/index.svelte
		pattern: /^\/routing\/client\/bar\/?$/,
		params: empty,
		parts: [components[16]]
	},

	{
		// test/apps/basics/src/routes/routing/client/bar/b.svelte
		pattern: /^\/routing\/client\/bar\/b\/?$/,
		params: empty,
		parts: [components[17]]
	},

	{
		// test/apps/basics/src/routes/routing/client/foo.svelte
		pattern: /^\/routing\/client\/foo\/?$/,
		params: empty,
		parts: [components[18]]
	},

	{
		// test/apps/basics/src/routes/routing/regexp/[id([0-9]+)].svelte
		pattern: /^\/routing\/regexp\/([0-9]+)\/?$/,
		params: (m) => ({ id: d(m[1])}),
		parts: [components[19]]
	},

	{
		// test/apps/basics/src/routes/routing/const.svelte
		pattern: /^\/routing\/const\/?$/,
		params: empty,
		parts: [components[20]]
	},

	{
		// test/apps/basics/src/routes/routing/dirs/bar/index.svelte
		pattern: /^\/routing\/dirs\/bar\/?$/,
		params: empty,
		parts: [components[21]]
	},

	{
		// test/apps/basics/src/routes/routing/dirs/bar/[a].svelte
		pattern: /^\/routing\/dirs\/bar\/([^/]+?)\/?$/,
		params: (m) => ({ a: d(m[1])}),
		parts: [components[22]]
	},

	{
		// test/apps/basics/src/routes/routing/dirs/foo/index.svelte
		pattern: /^\/routing\/dirs\/foo\/?$/,
		params: empty,
		parts: [components[23]]
	},

	{
		// test/apps/basics/src/routes/routing/dirs/foo/[b].svelte
		pattern: /^\/routing\/dirs\/foo\/([^/]+?)\/?$/,
		params: (m) => ({ b: d(m[1])}),
		parts: [components[24]]
	},

	{
		// test/apps/basics/src/routes/routing/a.svelte
		pattern: /^\/routing\/a\/?$/,
		params: empty,
		parts: [components[25]]
	},

	{
		// test/apps/basics/src/routes/routing/b/index.svelte
		pattern: /^\/routing\/b\/?$/,
		params: empty,
		parts: [components[26]]
	},

	{
		// test/apps/basics/src/routes/routing/[id([0-9]+)].svelte
		pattern: /^\/routing\/([0-9]+)\/?$/,
		params: (m) => ({ id: d(m[1])}),
		parts: [components[27]]
	},

	{
		// test/apps/basics/src/routes/routing/[slug].svelte
		pattern: /^\/routing\/([^/]+?)\/?$/,
		params: (m) => ({ slug: d(m[1])}),
		parts: [components[28]]
	},

	{
		// test/apps/basics/src/routes/routing/[...rest]/deep.svelte
		pattern: /^\/routing\/(.+)\/deep\/?$/,
		params: (m) => ({ rest: d(m[1]).split('/')}),
		parts: [components[29]]
	},

	{
		// test/apps/basics/src/routes/routing/[...rest]/index.svelte
		pattern: /^\/routing\/(.+)\/?$/,
		params: (m) => ({ rest: d(m[1]).split('/')}),
		parts: [components[30]]
	},

	{
		// test/apps/basics/src/routes/errors/load-error-malformed-client.svelte
		pattern: /^\/errors\/load-error-malformed-client\/?$/,
		params: empty,
		parts: [components[31]]
	},

	{
		// test/apps/basics/src/routes/errors/load-error-malformed-server.svelte
		pattern: /^\/errors\/load-error-malformed-server\/?$/,
		params: empty,
		parts: [components[32]]
	},

	{
		// test/apps/basics/src/routes/errors/load-error-string-client.svelte
		pattern: /^\/errors\/load-error-string-client\/?$/,
		params: empty,
		parts: [components[33]]
	},

	{
		// test/apps/basics/src/routes/errors/load-error-string-server.svelte
		pattern: /^\/errors\/load-error-string-server\/?$/,
		params: empty,
		parts: [components[34]]
	},

	{
		// test/apps/basics/src/routes/errors/module-scope-client.svelte
		pattern: /^\/errors\/module-scope-client\/?$/,
		params: empty,
		parts: [components[35]]
	},

	{
		// test/apps/basics/src/routes/errors/module-scope-server.svelte
		pattern: /^\/errors\/module-scope-server\/?$/,
		params: empty,
		parts: [components[36]]
	},

	{
		// test/apps/basics/src/routes/errors/load-error-client.svelte
		pattern: /^\/errors\/load-error-client\/?$/,
		params: empty,
		parts: [components[37]]
	},

	{
		// test/apps/basics/src/routes/errors/load-error-server.svelte
		pattern: /^\/errors\/load-error-server\/?$/,
		params: empty,
		parts: [components[38]]
	},

	{
		// test/apps/basics/src/routes/errors/load-client.svelte
		pattern: /^\/errors\/load-client\/?$/,
		params: empty,
		parts: [components[39]]
	},

	{
		// test/apps/basics/src/routes/errors/load-server.svelte
		pattern: /^\/errors\/load-server\/?$/,
		params: empty,
		parts: [components[40]]
	},

	{
		// test/apps/basics/src/routes/errors/clientside.svelte
		pattern: /^\/errors\/clientside\/?$/,
		params: empty,
		parts: [components[41]]
	},

	{
		// test/apps/basics/src/routes/errors/serverside.svelte
		pattern: /^\/errors\/serverside\/?$/,
		params: empty,
		parts: [components[42]]
	},

	{
		// test/apps/basics/src/routes/errors/endpoint.svelte
		pattern: /^\/errors\/endpoint\/?$/,
		params: empty,
		parts: [components[43]]
	},

	{
		// test/apps/basics/src/routes/paths/index.svelte
		pattern: /^\/paths\/?$/,
		params: empty,
		parts: [components[44]]
	},

	{
		// test/apps/basics/src/routes/query/echo.svelte
		pattern: /^\/query\/echo\/?$/,
		params: empty,
		parts: [components[45]]
	},

	{
		// test/apps/basics/src/routes/store/index.svelte
		pattern: /^\/store\/?$/,
		params: empty,
		parts: [components[46]]
	},

	{
		// test/apps/basics/src/routes/store/navigating/a.svelte
		pattern: /^\/store\/navigating\/a\/?$/,
		params: empty,
		parts: [components[47], components[48]]
	},

	{
		// test/apps/basics/src/routes/store/navigating/b.svelte
		pattern: /^\/store\/navigating\/b\/?$/,
		params: empty,
		parts: [components[47], components[49]]
	},

	{
		// test/apps/basics/src/routes/store/result.svelte
		pattern: /^\/store\/result\/?$/,
		params: empty,
		parts: [components[50]]
	},

	{
		// test/apps/basics/src/routes/host/index.svelte
		pattern: /^\/host\/?$/,
		params: empty,
		parts: [components[51]]
	},

	{
		// test/apps/basics/src/routes/load/index.svelte
		pattern: /^\/load\/?$/,
		params: empty,
		parts: [components[52]]
	},

	{
		// test/apps/basics/src/routes/load/change-detection/one/[x].svelte
		pattern: /^\/load\/change-detection\/one\/([^/]+?)\/?$/,
		params: (m) => ({ x: d(m[1])}),
		parts: [components[53]]
	},

	{
		// test/apps/basics/src/routes/load/change-detection/two/[y].svelte
		pattern: /^\/load\/change-detection\/two\/([^/]+?)\/?$/,
		params: (m) => ({ y: d(m[1])}),
		parts: [components[54]]
	},

	{
		// test/apps/basics/src/routes/load/serialization.svelte
		pattern: /^\/load\/serialization\/?$/,
		params: empty,
		parts: [components[55]]
	},

	{
		// test/apps/basics/src/routes/load/context/[x]/[y]/[z].svelte
		pattern: /^\/load\/context\/([^/]+?)\/([^/]+?)\/([^/]+?)\/?$/,
		params: (m) => ({ x: d(m[1]), y: d(m[2]), z: d(m[3])}),
		parts: [components[56], components[57], components[58], components[59]]
	},

	{
		// test/apps/basics/src/routes/load/[dynamic].svelte
		pattern: /^\/load\/([^/]+?)\/?$/,
		params: (m) => ({ dynamic: d(m[1])}),
		parts: [components[60]]
	},

	{
		// test/apps/basics/src/routes/css/index.svelte
		pattern: /^\/css\/?$/,
		params: empty,
		parts: [components[61]]
	}
];

export const ignore = [
	/^\/delete-route\/([^/]+?)\.json$/,
	/^\/middleware\/index_\/?$/,
	/^\/caching\/private\/uses-fetch\.json$/,
	/^\/routing\/ambiguous\/([^/]+?)\.json$/,
	/^\/routing\/b\.json$/,
	/^\/routing\/(.+)\/deep\.json$/,
	/^\/errors\/invalid-route-response\/?$/,
	/^\/errors\/endpoint\.json$/,
	/^\/load\/serialization\.json$/,
	/^\/load\/([^/]+?)\.json$/
];

export { layout };