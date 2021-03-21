import { CSRComponent, CSRRoute, Page } from '../../../types.internal';

export type NavigationTarget = {
	nodes: Array<Promise<CSRComponent>>;
	page: Page;
};

export type Navigation = {
	routes: CSRRoute[];
	path: string;
	query: URLSearchParams;
};
