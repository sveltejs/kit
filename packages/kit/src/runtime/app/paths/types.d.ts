import {
	PathnameWithSearchOrHash,
	RouteId,
	RouteIdWithSearchOrHash,
	RouteParams
} from '$app/types';

type StripSearchOrHash<T extends string> = T extends `${infer Pathname}?${string}`
	? Pathname
	: T extends `${infer Pathname}#${string}`
		? Pathname
		: T;

export type ResolveArgs<T extends RouteIdWithSearchOrHash | PathnameWithSearchOrHash> =
	T extends RouteId
		? RouteParams<T> extends Record<string, never>
			? [route: T]
			: [route: T, params: RouteParams<T>]
		: StripSearchOrHash<T> extends infer U extends RouteId
			? RouteParams<U> extends Record<string, never>
				? [route: T]
				: [route: T, params: RouteParams<U>]
			: [route: T];
