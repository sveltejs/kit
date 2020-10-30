import { PageComponentManifest, RouteManifest, PageManifest, EndpointManifest } from '../../types';

const examplePagComponentManifest: PageComponentManifest = {
  default: true,
  type: 'foo',
  name: 'bar',
  file: 'baz'
}

const examplePageManifest: PageManifest = {
  pattern: /a/,
	path: 'qux',
	parts: [ {
		component: examplePagComponentManifest,
		params: [ 'quux', 'corge' ]
  } ]
}

const exampleEndpointManifest: EndpointManifest = {
  name: 'grault',
	pattern: /b/,
	file: 'garply',
	params: [ 'waldo', 'fred' ]
}

export const exampleRouteManifest: RouteManifest = {
  layout: examplePagComponentManifest,
  error: examplePagComponentManifest,
  components: [ examplePagComponentManifest, examplePagComponentManifest ],
  pages: [ examplePageManifest, examplePageManifest ],
  endpoints: [ exampleEndpointManifest, exampleEndpointManifest ]
}
