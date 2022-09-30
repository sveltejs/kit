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
type LayoutParams = RouteParams & { rest?: string };
type LayoutParentData = EnsureDefined<import('../$types.js').LayoutData>;

export type LayoutServerData = null;
export type LayoutLoad<
	OutputData extends (Partial<App.PageData> & Record<string, any>) | void =
		| (Partial<App.PageData> & Record<string, any>)
		| void
> = Kit.Load<LayoutParams, LayoutServerData, LayoutParentData, OutputData>;
export type LayoutLoadEvent = Parameters<LayoutLoad>[0];
export type LayoutData = Expand<
	Omit<
		LayoutParentData,
		keyof Kit.AwaitedProperties<
			Awaited<ReturnType<typeof import('../../../../../../../../../nested/+layout.js').load>>
		>
	> &
		EnsureDefined<
			Kit.AwaitedProperties<
				Awaited<ReturnType<typeof import('../../../../../../../../../nested/+layout.js').load>>
			>
		>
>;
