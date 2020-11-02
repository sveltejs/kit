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

interface Route {
  pattern: RegExp;
  parts: {
    params: (match: RegExpExecArray) => Record<string, string>,
		i: number
  }[];
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

export interface Page {
	host: string;
	path: string;
	params: Record<string, string | string[]>;
	query: Record<string, string | string[]>;
}

export interface PageContext extends Page {
	error?: Error
}
