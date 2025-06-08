import type { RouteId, RouteParams, Pathname } from './.svelte-kit/types/index.d.ts';

declare let id: RouteId;

// okay
id = '/';
id = '/foo/[bar]/[baz]';

// @ts-expect-error
id = '/nope';

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

pathname;
