export type Params = Record<string, string>;
export type Query = Record<string, string | string[]>;
export type Preload = (props: { params: Params, query: Query }) => Promise<any>;

export interface DOMComponent {
	$set: (data: any) => void;
	$destroy: () => void;
}

export interface DOMComponentConstructor {
	new (options: {
		target: Element;
		props: unknown;
		hydrate: boolean;
	}): DOMComponent;
}

export interface Route {
	pattern: RegExp;
	parts: Array<{
		i: number;
		params?: (match: RegExpExecArray) => Record<string, string>;
	}>;
}

export interface HydratedTarget {
	redirect?: Redirect;
	preload_error?: any;
	props: any;
	branch: Array<{ Component: DOMComponentConstructor, preload: (page) => Promise<any>, segment: string }>;
}

export interface ScrollPosition {
	x: number;
	y: number;
}

export interface Target {
	href: string;
	route: Route;
	match: RegExpExecArray;
	page: Page;
}

export interface Redirect {
	status: number;
	location: string;
}

export interface Page {
	host: string;
	path: string;
	params: Record<string, string>;
	query: Record<string, string | string[]>;
}