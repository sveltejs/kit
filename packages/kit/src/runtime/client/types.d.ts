import { CSRComponent, CSRRoute, NormalizedLoadOutput } from 'types';

export type NavigationInfo = {
	id: string;
	routes: CSRRoute[];
	url: URL;
	path: string;
};

export type NavigationCandidate = {
	route: CSRRoute;
	info: NavigationInfo;
};

export type NavigationResult = {
	redirect?: string;
	state: NavigationState;
	props: Record<string, any>;
};

export type BranchNode = {
	module: CSRComponent;
	loaded: NormalizedLoadOutput | null;
	uses: {
		params: Set<string>;
		url: boolean; // TODO make more granular?
		session: boolean;
		stuff: boolean;
		dependencies: Set<string>;
	};
	stuff: Record<string, any>;
};

export type NavigationState = {
	url: URL;
	params: Record<string, string>;
	branch: Array<BranchNode | undefined>;
	session_id: number;
};
