export type NavigationTarget = {
	href: string;
	route: import('../../types').Page;
	match;
	page: {
		host: string;
		path: string;
		query: URLSearchParams;
		params: Record<string, string | string[]>;
	};
};
