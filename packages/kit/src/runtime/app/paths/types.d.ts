import { Pathname, ResolveURLParams, RouteId, RouteParams } from '$app/types';

export type ResolveArgs<T extends RouteId | Pathname> = T extends RouteId
	? RouteParams<T> extends Record<string, never>
		? [route: T, options?: ResolveURLParams]
		: [route: T, params: RouteParams<T>, options?: ResolveURLParams]
	: [route: T, options?: ResolveURLParams];
