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
type LayoutParams = RouteParams & { rest?: string; slug?: string };
type LayoutParentData = EnsureParentData<{}>;

export type LayoutServerData = null;
export type LayoutLoad<
	OutputData extends OutputDataShape<LayoutParentData> = OutputDataShape<LayoutParentData>
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
