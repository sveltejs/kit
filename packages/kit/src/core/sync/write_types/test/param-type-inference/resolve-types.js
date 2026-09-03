import { resolve } from '$app/paths';

/** @typedef {import('$app/paths/types.js').ResolveArgs<'/parsed/[id=number]'>} ParsedResolveArgs */

/** @type {ParsedResolveArgs} */
const _valid = ['/parsed/[id=number]', { id: 2 }];

/** @type {ParsedResolveArgs} */
// @ts-expect-error id must be a number
const _invalid_string = ['/parsed/[id=number]', { id: '2' }];

/** @type {ParsedResolveArgs} */
// @ts-expect-error id must be a number
const _invalid_boolean = ['/parsed/[id=number]', { id: true }];

/** @typedef {'/static-1' | '/optional/[[optionalNarrowedParam=narrowed]]'} MixedRoute */
/** @typedef {import('$app/paths/types.js').ResolveArgs<MixedRoute>} MixedResolveArgs */

/** @type {MixedResolveArgs} */
const _valid_static = ['/static-1'];

/** @type {MixedResolveArgs} */
const _valid_dynamic = [
	'/optional/[[optionalNarrowedParam=narrowed]]',
	{ optionalNarrowedParam: 'a' }
];

/** @type {MixedResolveArgs} */
// @ts-expect-error static routes do not take params
const _invalid_static_params = ['/static-1', {}];

/** @type {MixedResolveArgs} */
const _invalid_dynamic_params = [
	'/optional/[[optionalNarrowedParam=narrowed]]',
	// @ts-expect-error dynamic route params must match their route
	{ optionalNarrowedParam: 'c' }
];

// Enough routes are needed to exceed TypeScript's inference cutoff and expose the full-union error.
const route = /** @type {import('$app/types').RouteId} */ ('/static-1');

resolve(route);
