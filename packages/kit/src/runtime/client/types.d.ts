import { CSRComponent, CSRRoute, Page } from '../../../types.internal';

export type NavigationInfo = {
	id: string;
	routes: CSRRoute[];
	path: string;
	query: URLSearchParams;
};

export type NavigationCandidate = {
	status: number;
	error: Error;
	nodes: Array<Promise<CSRComponent>>;
	page: Page;
};

export type NavigationResult = {
	reload?: boolean;
	redirect?: string;
	state?: NavigationState;
	props?: Record<string, any>;
};

export type NavigationState = {
	page: Page;
	query: string;
	session_changed: boolean;
	nodes: PageNode[];
	contexts: Array<Record<string, any[]>>;
};

type PageNode = {
	module: CSRComponent;
	uses: {
		params: Set<string>;
		path: boolean;
		query: boolean;
		session: boolean;
		context: boolean;
	};
};
