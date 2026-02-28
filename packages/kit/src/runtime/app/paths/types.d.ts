import { ResolvablePath, RouteId, RouteParams } from '$app/types';

export type ResolveArgs<T extends RouteId | ResolvablePath> = T extends RouteId
	? RouteParams<T> extends Record<string, never>
		? [route: T]
		: [route: T, params: RouteParams<T>]
	: [route: T];
