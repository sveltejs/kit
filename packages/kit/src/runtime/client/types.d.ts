import { CSRComponent, CSRPage, CSRRoute, NormalizedLoadOutput } from 'types/internal';
import { Page } from 'types/page';

export interface NavigationInfo {
	id: string;
	routes: CSRRoute[];
	path: string;
	decoded_path: string;
	query: URLSearchParams;
}

export interface NavigationCandidate {
	route: CSRPage;
	info: NavigationInfo;
}

export interface NavigationResult {
	reload?: boolean;
	redirect?: string;
	state: NavigationState;
	props: Record<string, any>;
}

export interface BranchNode {
	module: CSRComponent;
	loaded: NormalizedLoadOutput | null;
	uses: {
		params: Set<string>;
		path: boolean;
		query: boolean;
		session: boolean;
		stuff: boolean;
		dependencies: string[];
	};
	stuff: Record<string, any>;
}

export interface NavigationState {
	page: Page;
	branch: Array<BranchNode | undefined>;
	session_id: number;
}

export interface NavigationHandler {
	(
		info: NavigationInfo,
		chain: string[],
		no_cache: boolean,
		opts?: {hash?: string, scroll: { x: number, y: number } | null, keepfocus: boolean}
	): Promise<void>;
}

export interface PrefetchHandler {
	(info: NavigationInfo): Promise<NavigationResult>;
}
