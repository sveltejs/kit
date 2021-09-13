import { CSRComponent, CSRPage, CSRRoute, NormalizedLoadOutput } from 'types/internal';
import { Page } from 'types/page';

export type NavigationInfo = {
	id: string;
	routes: CSRRoute[];
	path: string;
	query: URLSearchParams;
};

export type NavigationCandidate = {
	route: CSRPage;
	info: NavigationInfo;
};

export type NavigationResult = {
	reload?: boolean;
	redirect?: string;
	state: NavigationState;
	props: Record<string, any>;
};

export type BranchNode = {
	module: CSRComponent;
	loaded: NormalizedLoadOutput | null;
	uses: {
		params: Set<string>;
		path: boolean;
		query: boolean;
		session: boolean;
		context: boolean;
		dependencies: string[];
	};
	context: Record<string, any>;
};

export type NavigationState = {
	page: Page;
	branch: Array<BranchNode | undefined>;
	session_id: number;
};
