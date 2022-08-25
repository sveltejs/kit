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
type PageServerParentData = EnsureParentData<LayoutServerData>;
type PageParentData = EnsureParentData<LayoutData>;
type LayoutParams = RouteParams & {};
type LayoutServerParentData = EnsureParentData<{}>;
type LayoutParentData = EnsureParentData<{}>;

export type PageServerLoad<
	OutputData extends (Partial<App.PageData> & Record<string, any>) | void =
		| (Partial<App.PageData> & Record<string, any>)
		| void
> = Kit.ServerLoad<RouteParams, PageServerParentData, OutputData>;
export type PageServerLoadEvent = Parameters<PageServerLoad>[0];
export type Errors = null;
export type PageServerData = Kit.AwaitedProperties<
	Awaited<ReturnType<typeof import('../../../../../../../../+page.server.js').load>>
>;
export type PageLoad<
	OutputData extends OutputDataShape<PageParentData> = OutputDataShape<PageParentData>
> = Kit.Load<RouteParams, PageServerData, PageParentData, OutputData>;
export type PageLoadEvent = Parameters<PageLoad>[0];
export type PageData = Omit<
	PageParentData,
	keyof Kit.AwaitedProperties<
		Awaited<ReturnType<typeof import('../../../../../../../../+page.js').load>>
	>
> &
	Kit.AwaitedProperties<
		Awaited<ReturnType<typeof import('../../../../../../../../+page.js').load>>
	>;
export type Action = Kit.Action<RouteParams>;
export type LayoutServerLoad<
	OutputData extends (Partial<App.PageData> & Record<string, any>) | void =
		| (Partial<App.PageData> & Record<string, any>)
		| void
> = Kit.ServerLoad<LayoutParams, LayoutServerParentData, OutputData>;
export type LayoutServerLoadEvent = Parameters<LayoutServerLoad>[0];
export type LayoutServerData = Kit.AwaitedProperties<
	Awaited<ReturnType<typeof import('../../../../../../../../+layout.server.js').load>>
>;
export type LayoutLoad<
	OutputData extends (Partial<App.PageData> & Record<string, any>) | void =
		| (Partial<App.PageData> & Record<string, any>)
		| void
> = Kit.Load<LayoutParams, LayoutServerData, LayoutParentData, OutputData>;
export type LayoutLoadEvent = Parameters<LayoutLoad>[0];
export type LayoutData = Omit<
	LayoutParentData,
	keyof Kit.AwaitedProperties<
		Awaited<ReturnType<typeof import('../../../../../../../../+layout.js').load>>
	>
> &
	Kit.AwaitedProperties<
		Awaited<ReturnType<typeof import('../../../../../../../../+layout.js').load>>
	>;
