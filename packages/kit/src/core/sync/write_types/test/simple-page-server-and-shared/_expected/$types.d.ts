import type * as Kit from '@sveltejs/kit';

type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
type RouteParams = {};
type MaybeWithVoid<T> = {} extends T ? T | void : T;
export type RequiredKeys<T> = {
	[K in keyof T]-?: {} extends { [P in K]: T[K] } ? never : K;
}[keyof T];
type OutputDataShape<T> = MaybeWithVoid<
	Omit<App.PageData, RequiredKeys<T>> &
		Partial<Pick<App.PageData, keyof T & keyof App.PageData>> &
		Record<string, any>
>;
type EnsureDefined<T> = T extends null | undefined ? {} : T;
type PageServerParentData = EnsureDefined<LayoutServerData>;
type PageParentData = EnsureDefined<LayoutData>;
type LayoutParams = RouteParams & {};
type LayoutParentData = EnsureDefined<{}>;

export type PageServerLoad<
	OutputData extends (Partial<App.PageData> & Record<string, any>) | void =
		| (Partial<App.PageData> & Record<string, any>)
		| void
> = Kit.ServerLoad<RouteParams, PageServerParentData, OutputData>;
export type PageServerLoadEvent = Parameters<PageServerLoad>[0];
export type ActionData = unknown;
export type PageServerData = Expand<
	Kit.AwaitedProperties<
		Awaited<ReturnType<typeof import('../../../../../../../../+page.server.js').load>>
	>
>;
export type PageLoad<
	OutputData extends OutputDataShape<PageParentData> = OutputDataShape<PageParentData>
> = Kit.Load<RouteParams, PageServerData, PageParentData, OutputData>;
export type PageLoadEvent = Parameters<PageLoad>[0];
export type PageData = Expand<
	Omit<
		PageParentData,
		keyof Kit.AwaitedProperties<
			Awaited<ReturnType<typeof import('../../../../../../../../+page.js').load>>
		>
	> &
		EnsureDefined<
			Kit.AwaitedProperties<
				Awaited<ReturnType<typeof import('../../../../../../../../+page.js').load>>
			>
		>
>;
export type Action = Kit.Action<RouteParams>;
export type Actions = Kit.Actions<RouteParams>;
export type LayoutServerData = null;
export type LayoutData = Expand<LayoutParentData>;
export type RequestEvent = Kit.RequestEvent<RouteParams>;
