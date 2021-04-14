import { CSRComponent, CSRRoute, LoadOutput } from '../../../types/internal';
import { Page } from '../../../types';

export type NavigationInfo = {
	id: string;
	routes: CSRRoute[];
	path: string;
	query: URLSearchParams;
};

export type NavigationCandidate = {
	route: CSRRoute;
	path: string;
	query: URLSearchParams;
};

export type NavigationResult = {
	reload?: boolean;
	redirect?: string;
	state?: NavigationState;
	props?: Record<string, any>;
};

export type BranchNode = {
	module: CSRComponent;
	loaded: LoadOutput;
	uses: {
		params: Set<string>;
		path: boolean;
		query: boolean;
		session: boolean;
		context: boolean;
	};
	context: Record<string, any>;
};

export type NavigationState = {
	page: Page;
	branch: BranchNode[];
	session_id: number;
};
