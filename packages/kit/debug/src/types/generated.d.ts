export interface RouteIds {
	a: never;
	b: never;
	c: {};
	d: {};
}

export type RouteWithParams = {
	[K in keyof RouteIds]: RouteIds[K] extends never ? never : K;
}[keyof RouteIds];

export type RouteWithoutParams = {
	[K in keyof RouteIds]: RouteIds[K] extends never ? K : never;
}[keyof RouteIds];
