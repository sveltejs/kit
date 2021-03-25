import { CSRComponent, CSRRoute, Page } from '../../../types.internal';

export type NavigationInfo = {
	id: string;
	routes: CSRRoute[];
	path: string;
	query: URLSearchParams;
};

export type NavigationCandidate = {
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
	component: CSRComponent;
	uses: {
		params: Set<string>;
		query: boolean;
		session: boolean;
		context: boolean;
	};
};
