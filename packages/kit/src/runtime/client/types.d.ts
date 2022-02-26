import { CSRComponent, CSRRoute, NormalizedLoadOutput } from 'types';

export interface NavigationHandler {
	(
		url: URL,
		opts: { hash?: string; scroll: { x: number; y: number } | null; keepfocus: boolean },
		redirect_chain: string[]
	): Promise<void>;
}

export interface NavigationInfo {
	routes: CSRRoute[];
	url: URL;
	path: string;
}

export interface NavigationCandidate {
	route: CSRRoute;
	info: NavigationInfo;
}

export interface LoadResult {
	redirect?: string;
	state: NavigationState;
	props: Record<string, any>;
}

export interface BranchNode {
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
}

export interface NavigationState {
	url: URL;
	params: Record<string, string>;
	branch: Array<BranchNode | undefined>;
	session_id: number;
}
