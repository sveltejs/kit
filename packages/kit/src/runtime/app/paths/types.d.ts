import { RouteId, RouteParams } from '$app/types';

type StripSearchOrHash<T extends string> = T extends `${infer U}?${string}`
	? U
	: T extends `${infer U}#${string}`
		? U
		: T;

export type ResolveArgs<T> = T extends `/${string}`
	? StripSearchOrHash<T> extends infer U extends RouteId
		? RouteParams<U> extends Record<string, never>
			? [route: T]
			: [route: T, params: RouteParams<U>]
		: [never]
	: [pathname: T];
