import { RouteId, RouteParams } from '$app/types';

type StripSearchOrHash<T extends string> = T extends `${infer U}?${string}`
	? U
	: T extends `${infer U}#${string}`
		? U
		: T;

type ResolveParams<T> = T extends `/${string}`
	? StripSearchOrHash<T> extends infer U extends RouteId
		? RouteParams<U>
		: never
	: never;

// Distribute over the parameter types, not the argument tuple, so union-valued
// route IDs and params (for example, from `match`) can be passed together.
// Validate leading-slash strings separately: pathname patterns can also match them.
export type ResolveArgs<T> =
	StripSearchOrHash<Extract<T, `/${string}`>> extends RouteId
		? [ResolveParams<T>] extends [never]
			? [pathname: T]
			: ResolveParams<T> extends Record<string, never>
				? [route: T, params?: ResolveParams<T>]
				: [route: T, params: ResolveParams<T>]
		: [never];
