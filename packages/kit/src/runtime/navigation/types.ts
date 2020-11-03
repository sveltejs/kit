export interface HydratedTarget {
	redirect?: Redirect;
	preload_error?: any;
	props: any;
	branch: Branch;
}

export type Branch = Array<{
	segment: string;
	match?: RegExpExecArray;
	component?: any; // TODO DOMComponentConstructor;
	part?: number;
}>;

export interface InitialData {
	session: any;
	preloaded?: object[];
	status: number;
	error: Error;
	baseUrl: string;
}

export interface ScrollPosition {
	x: number;
	y: number;
}

export type RouteParams = Record<string, string | string[]>;

export interface Route {
  pattern: RegExp;
  parts: Array<{
    params: (match: RegExpExecArray) => RouteParams,
		i: number
  }>;
}

export interface Target {
	href: string;
	route: Route;
	match: RegExpExecArray;
	page: Page;
}

export interface Redirect {
	statusCode: number;
	location: string;
}

export type Query = Record<string, string | string[]>;

export interface Page {
	host: string;
	path: string;
	params: RouteParams;
	query: Query;
}

export interface PageContext extends Page {
	error?: Error
}
