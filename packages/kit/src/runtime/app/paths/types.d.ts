import { RouteId, RouteParams } from '$app/types';

type StripSearchOrHash<T extends string> = T extends `${infer U}?${string}`
	? U
	: T extends `${infer U}#${string}`
		? U
		: T;

type ResolveRouteArgs<T extends string> = T extends unknown
	? StripSearchOrHash<T> extends infer U extends RouteId
		? RouteParams<U> extends Record<string, never>
			? [route: T]
			: [route: T, params: RouteParams<U>]
		: [never]
	: never;

type HasRouteParams<T extends string> = T extends unknown
	? StripSearchOrHash<T> extends infer U extends RouteId
		? RouteParams<U> extends Record<string, never>
			? never
			: true
		: never
	: never;

export type ResolveArgs<T extends string> = [T] extends [`/${string}`]
	? [HasRouteParams<T>] extends [never]
		? [route: T]
		: ResolveRouteArgs<T>
	: [pathname: T];
