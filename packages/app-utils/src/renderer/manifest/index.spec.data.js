const examplePageComponentManifest = {
	default: true,
	type: 'foo',
	name: 'bar',
	file: 'baz',
	url: 'boo'
};

const examplePageManifest = {
	pattern: /a/,
	path: 'qux',
	parts: [
		{
			component: examplePageComponentManifest,
			params: ['quux', 'corge']
		}
	]
};

const exampleEndpointManifest = {
	name: 'grault',
	pattern: /b/,
	file: 'garply',
	url: 'bla',
	params: ['waldo', 'fred']
};

export const exampleRouteManifest = {
	layout: examplePageComponentManifest,
	error: examplePageComponentManifest,
	components: [examplePageComponentManifest, examplePageComponentManifest],
	pages: [examplePageManifest, examplePageManifest],
	endpoints: [exampleEndpointManifest, exampleEndpointManifest]
};
