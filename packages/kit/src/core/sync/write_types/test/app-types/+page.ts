import type { RouteId, RouteParams, Pathname } from '$app/types';

declare let id: RouteId;

// okay
id = '/';
id = '/foo/[bar]/[baz]';
id = '/(group)/path-a';

// @ts-expect-error
id = '/nope';

// read `id` otherwise it is treated as unused
id;

declare let params: RouteParams<'/foo/[bar]/[baz]'>;

// @ts-expect-error
params.foo; // not okay
params.bar; // okay
params.baz; // okay

declare let pathname: Pathname;

// @ts-expect-error
pathname = '/nope';
pathname = '/foo';
pathname = '/foo/1/2';
pathname = '/foo/';
pathname = '/foo/1/2/';

// Test layout groups
pathname = '/path-a';
// @ts-expect-error default trailing slash is never, so we should not have it here
pathname = '/path-a/';
// @ts-expect-error layout group names are NOT part of the pathname type
pathname = '/(group)/path-a';

// Test trailing-slash - always
pathname = '/path-a/trailing-slash/always/';
pathname = '/path-a/trailing-slash/always/layout/inside/';

// Test trailing-slash - ignore
pathname = '/path-a/trailing-slash/ignore';
pathname = '/path-a/trailing-slash/ignore/';
pathname = '/path-a/trailing-slash/ignore/layout/inside';
pathname = '/path-a/trailing-slash/ignore/layout/inside/';

// Test trailing-slash - never (default)
pathname = '/path-a/trailing-slash/never';
pathname = '/path-a/trailing-slash/never/layout/inside';

// read `pathname` otherwise it is treated as unused
pathname;
