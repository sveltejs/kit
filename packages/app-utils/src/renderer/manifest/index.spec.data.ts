import { PageComponentManifest, RouteManifest, PageManifest, EndpointManifest } from '../../types';

const examplePageComponentManifest: PageComponentManifest = {
	default: true,
	type: 'foo',
	name: 'bar',
	file: 'baz',
	url: 'boo'
};

const examplePageManifest: PageManifest = {
	pattern: /a/,
	path: 'qux',
	parts: [
		{
			component: examplePageComponentManifest,
			params: ['quux', 'corge']
		}
	]
};

const exampleEndpointManifest: EndpointManifest = {
	name: 'grault',
	pattern: /b/,
	file: 'garply',
	url: 'bla',
	params: ['waldo', 'fred']
};

export const exampleRouteManifest: RouteManifest = {
	layout: examplePageComponentManifest,
	error: examplePageComponentManifest,
	components: [examplePageComponentManifest, examplePageComponentManifest],
	pages: [examplePageManifest, examplePageManifest],
	endpoints: [exampleEndpointManifest, exampleEndpointManifest]
};
