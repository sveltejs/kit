/** @type {import('$app/types').RouteId} */
let id;

// okay
id = '/';
id = '/foo/[bar]/[baz]';
id = '/(group)/path-a';

// @ts-expect-error
// eslint-disable-next-line @typescript-eslint/no-unused-vars
id = '/nope';

/** @type {import('$app/types').RouteParams<'/foo/[bar]/[baz]'>} */
const params = {
	bar: 'A',
	baz: 'B'
};

// @ts-expect-error foo is not a param
params.foo;
params.bar; // okay
params.baz; // okay

/** @type {import('$app/types').Pathname} */
let pathname;

// @ts-expect-error route doesn't exist
pathname = '/nope';
// @ts-expect-error route doesn't exist
pathname = '/foo';
// @ts-expect-error route doesn't exist
pathname = '/foo/';
pathname = '/foo/1/2'; // okay
pathname = '/foo/1/2/'; // okay

// Test layout groups
pathname = '/path-a';
// @ts-expect-error default trailing slash is never, so we should not have it here
pathname = '/path-a/';
// @ts-expect-error layout group names are NOT part of the pathname type
pathname = '/(group)/path-a';

// Test trailing-slash - always
pathname = '/path-a/trailing-slash/always/';
pathname = '/path-a/trailing-slash/always/endpoint/';
pathname = '/path-a/trailing-slash/always/layout/inside/';

// Test trailing-slash - ignore
pathname = '/path-a/trailing-slash/ignore';
pathname = '/path-a/trailing-slash/ignore/';
pathname = '/path-a/trailing-slash/ignore/endpoint';
pathname = '/path-a/trailing-slash/ignore/endpoint/';
pathname = '/path-a/trailing-slash/ignore/layout/inside';
pathname = '/path-a/trailing-slash/ignore/layout/inside/';

// Test trailing-slash - never (default)
pathname = '/path-a/trailing-slash/never';
pathname = '/path-a/trailing-slash/never/endpoint';
pathname = '/path-a/trailing-slash/never/layout/inside';

// Test trailing-slash - always (endpoint) and never (page)
pathname = '/path-a/trailing-slash/mixed';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
pathname = '/path-a/trailing-slash/mixed/';
