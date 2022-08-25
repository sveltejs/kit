import type * as Kit from '@sveltejs/kit';

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
type EnsureParentData<T> = NonNullable<T> extends never ? {} : T;
type PageParentData = EnsureParentData<import('../$types.js').LayoutData>;
type LayoutParams = RouteParams & {};
type LayoutServerParentData = EnsureParentData<import('../$types.js').LayoutServerData>;
type LayoutParentData = EnsureParentData<import('../$types.js').LayoutData>;

export type PageServerData = null;
export type PageLoad<
	OutputData extends OutputDataShape<PageParentData> = OutputDataShape<PageParentData>
> = Kit.Load<RouteParams, PageServerData, PageParentData, OutputData>;
export type PageLoadEvent = Parameters<PageLoad>[0];
export type PageData = Omit<
	PageParentData,
	keyof Kit.AwaitedProperties<
		Awaited<ReturnType<typeof import('../../../../../../../../../(main)/+page.js').load>>
	>
> &
	Kit.AwaitedProperties<
		Awaited<ReturnType<typeof import('../../../../../../../../../(main)/+page.js').load>>
	>;
export type LayoutServerLoad<
	OutputData extends (Partial<App.PageData> & Record<string, any>) | void =
		| (Partial<App.PageData> & Record<string, any>)
		| void
> = Kit.ServerLoad<LayoutParams, LayoutServerParentData, OutputData>;
export type LayoutServerLoadEvent = Parameters<LayoutServerLoad>[0];
export type LayoutServerData = Kit.AwaitedProperties<
	Awaited<ReturnType<typeof import('../../../../../../../../../(main)/+layout.server.js').load>>
>;
export type LayoutData = Omit<LayoutParentData, keyof LayoutServerData> & LayoutServerData;
