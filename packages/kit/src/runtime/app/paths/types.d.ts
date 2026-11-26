import { ResolvableRouteId, RouteId, RouteParams } from '$app/types';

type StripSearchOrHash<T extends string> = T extends `${infer U}?${string}`
	? U
	: T extends `${infer U}#${string}`
		? U
		: T;

type StripTrailingSlash<T extends ResolvableRouteId> = T extends '/'
	? T
	: T extends `${infer U}/`
		? U
		: T;

export type ResolveArgs<T> = T extends `/${string}`
	? StripSearchOrHash<T> extends infer U extends ResolvableRouteId
		? StripTrailingSlash<U> extends infer R extends RouteId
			? RouteParams<R> extends Record<string, never>
				? [route: T]
				: [route: T, params: RouteParams<R>]
			: [never]
		: [never]
	: [pathname: T];
