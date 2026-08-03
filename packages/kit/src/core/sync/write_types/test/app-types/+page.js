/** @type {import('$app/types').RouteId} */
let id;

// okay
id = '/';
id = '/foo/[bar]/[baz]';
id = '/(group)/path-a';
id = '/(group)/path-a/trailing-slash/always/endpoint'; // endpoint-only
id = '/(group)/path-a/trailing-slash/mixed'; // page and endpoint

// @ts-expect-error
id = '/nope';

// @ts-expect-error `/foo` is a directory with no `+page` or `+server`, so it is not a route
id = '/foo';

// @ts-expect-error a directory with only a `+layout` is not a route either
// eslint-disable-next-line @typescript-eslint/no-unused-vars
id = '/(group)/path-a/trailing-slash/always/layout';

/** @type {import('$app/types').PageRouteId} */
let page_id;

page_id = '/(group)/path-a'; // okay
page_id = '/(group)/path-a/trailing-slash/mixed'; // okay, has both a `+page` and a `+server`

// @ts-expect-error `/(group)/path-a/trailing-slash/always/endpoint` only has a `+server`
page_id = '/(group)/path-a/trailing-slash/always/endpoint';

// @ts-expect-error `/foo` is a directory with no `+page` or `+server`
page_id = '/foo';

// @ts-expect-error
// eslint-disable-next-line @typescript-eslint/no-unused-vars
page_id = '/nope';

/** @type {import('$app/types').EndpointRouteId} */
let endpoint_id;

endpoint_id = '/(group)/path-a/trailing-slash/always/endpoint'; // okay
endpoint_id = '/(group)/path-a/trailing-slash/mixed'; // okay, has both a `+page` and a `+server`

// @ts-expect-error `/(group)/path-a` only has a `+page`
endpoint_id = '/(group)/path-a';

// @ts-expect-error `/foo` is a directory with no `+page` or `+server`
endpoint_id = '/foo';

// @ts-expect-error
// eslint-disable-next-line @typescript-eslint/no-unused-vars
endpoint_id = '/nope';

// a directory with only a `+layout` is not a route, but `LayoutParams` still accepts it
/** @type {import('$app/types').LayoutParams<'/(group)/path-a/trailing-slash/always/layout'>} */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const layoutOnlyParams = {};

// endpoints have params too
/** @type {import('$app/types').RouteParams<'/(group)/path-a/trailing-slash/always/endpoint'>} */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const endpointParams = {};

/** @type {import('$app/manifest').ManifestRoute[]} */
const manifest_routes = [
	{ id: '/(group)/path-a', page: true, endpoint: false },
	{ id: '/(group)/path-a/trailing-slash/always/endpoint', page: false, endpoint: true },
	{ id: '/(group)/path-a/trailing-slash/mixed', page: true, endpoint: true }
];

/** @type {import('$app/manifest').ManifestRoute[]} */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const impossible_manifest_routes = [
	// @ts-expect-error a route always has a page and/or an endpoint
	{ id: '/(group)/path-a', page: false, endpoint: false },
	// @ts-expect-error `/(group)/path-a` has no endpoint
	{ id: '/(group)/path-a', page: true, endpoint: true },
	// @ts-expect-error the capability booleans are required
	{ id: '/(group)/path-a' }
];

for (const route of manifest_routes) {
	if (route.page && !route.endpoint) {
		/** @type {Exclude<import('$app/types').PageRouteId, import('$app/types').EndpointRouteId>} */
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const page_only_id = route.id;

		/** @type {import('$app/types').EndpointRouteId} */
		// @ts-expect-error a page-only route ID is never an endpoint route ID
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const not_an_endpoint_id = route.id;
	} else if (!route.page && route.endpoint) {
		/** @type {Exclude<import('$app/types').EndpointRouteId, import('$app/types').PageRouteId>} */
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const endpoint_only_id = route.id;

		/** @type {import('$app/types').PageRouteId} */
		// @ts-expect-error an endpoint-only route ID is never a page route ID
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const not_a_page_id = route.id;
	} else {
		/** @type {Extract<import('$app/types').PageRouteId, import('$app/types').EndpointRouteId>} */
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const dual_id = route.id;

		// a dual route ID belongs to both capability unions
		/** @type {import('$app/types').PageRouteId} */
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const also_a_page_id = route.id;

		/** @type {import('$app/types').EndpointRouteId} */
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const also_an_endpoint_id = route.id;
	}
}

/** @type {import('$app/types').RouteParams<'/foo/[bar]/[baz]'>} */
const params = {
	bar: 'A',
	baz: 'B'
};

// @ts-expect-error foo is not a param
params.foo;
params.bar; // okay
params.baz; // okay

/** @type {import('$app/types').RouteParams<'/matcher-test/no-matcher/[locale]'>} */
const noMatcherPageParams = {
	locale: 'fr' // any string
};

/** @type {import('$app/types').LayoutParams<'/matcher-test/no-matcher'>} */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const noMatcherLayoutParams = {};

noMatcherPageParams.locale = 'fr'; // any string

/** @type {import('$app/types').RouteParams<'/matcher-test/with-matcher/[[locale=locale]]'>} */
const withMatcherPageParams = {};

/** @type {import('$app/types').RouteParams<'/matcher-test/with-matcher/[[locale=locale]]'>} */
const withMatcherPageParamsWithUndefined = {
	locale: undefined
};

// @ts-expect-error locale should be "en" or "nb"
withMatcherPageParams.locale = 'fr';
withMatcherPageParams.locale = undefined; // okay
withMatcherPageParams.locale = 'en'; // okay
withMatcherPageParams.locale = 'nb'; // okay
withMatcherPageParamsWithUndefined.locale = 'en'; // okay

/** @type {import('$app/types').LayoutParams<'/matcher-test/with-matcher'>} */
const withMatcherLayoutParams = {};

/** @type {import('$app/types').LayoutParams<'/matcher-test/with-matcher'>} */
const withMatcherLayoutParamsWithUndefined = {
	locale: undefined
};

// @ts-expect-error locale should be "en" or "nb"
withMatcherLayoutParams.locale = 'fr';
withMatcherLayoutParams.locale = undefined; // okay
withMatcherLayoutParams.locale = 'en'; // okay
withMatcherLayoutParams.locale = 'nb'; // okay
withMatcherLayoutParamsWithUndefined.locale = 'nb'; // okay

// @ts-expect-error `/matcher-test` does not contain a layout
/** @type {import('$app/types').LayoutParams<'/matcher-test'>} */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const matcherParentLayoutParams = {};

/** @type {import('$app/types').Path} */
let pathname;

// @ts-expect-error route doesn't exist
pathname = 'nope';
// @ts-expect-error route doesn't exist
pathname = 'foo';
// @ts-expect-error route doesn't exist
pathname = 'foo/';
pathname = 'foo/1/2'; // okay
pathname = 'foo/1/2/'; // okay

// Test layout groups
pathname = 'path-a';
// @ts-expect-error default trailing slash is never, so we should not have it here
pathname = 'path-a/';
// @ts-expect-error layout group names are NOT part of the pathname type
pathname = '(group)/path-a';

// Test trailing-slash - always
pathname = 'path-a/trailing-slash/always/';
pathname = 'path-a/trailing-slash/always/endpoint/';
pathname = 'path-a/trailing-slash/always/layout/inside/';

// Test trailing-slash - ignore
pathname = 'path-a/trailing-slash/ignore';
pathname = 'path-a/trailing-slash/ignore/';
pathname = 'path-a/trailing-slash/ignore/endpoint';
pathname = 'path-a/trailing-slash/ignore/endpoint/';
pathname = 'path-a/trailing-slash/ignore/layout/inside';
pathname = 'path-a/trailing-slash/ignore/layout/inside/';

// Test trailing-slash - never (default)
pathname = 'path-a/trailing-slash/never';
pathname = 'path-a/trailing-slash/never/endpoint';
pathname = 'path-a/trailing-slash/never/layout/inside';

// Test trailing-slash - always (endpoint) and never (page)
pathname = 'path-a/trailing-slash/mixed';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
pathname = 'path-a/trailing-slash/mixed/';
