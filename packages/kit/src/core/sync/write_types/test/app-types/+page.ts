import type { RouteId, RouteParams } from './.svelte-kit/types/index.d.ts';

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
