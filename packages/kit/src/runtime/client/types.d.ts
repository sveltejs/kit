import {
	afterNavigate,
	beforeNavigate,
	goto,
	invalidate,
	prefetch,
	prefetchRoutes
} from '$app/navigation';
import { CSRPageNode, CSRRoute } from 'types';

export interface Client {
	// public API, exposed via $app/navigation
	after_navigate: typeof afterNavigate;
	before_navigate: typeof beforeNavigate;
	disable_scroll_handling: () => void;
	goto: typeof goto;
	invalidate: typeof invalidate;
	prefetch: typeof prefetch;
	prefetch_routes: typeof prefetchRoutes;

	// private API
	_hydrate: (opts: {
		status: number;
		error: Error;
		node_ids: number[];
		params: Record<string, string>;
		routeId: string | null;
	}) => Promise<void>;
	_start_router: () => void;
}

export type NavigationIntent = {
	/**
	 * `url.pathname + url.search`
	 */
	id: string;
	/**
	 * The route parameters
	 */
	params: Record<string, string>;
	/**
	 * The route that matches `path`
	 */
	route: CSRRoute;
	/**
	 * The destination URL
	 */
	url: URL;
};

export type NavigationResult = NavigationRedirect | NavigationFinished;
export type NavigationRedirect = {
	redirect: true;
	location: string;
};
export type NavigationFinished = {
	redirect?: false;
	state: NavigationState;
	props: Record<string, any>;
};

export type BranchNode = {
	node: CSRPageNode;
	data: Record<string, any>;
	uses: {
		params: Set<string>;
		url: boolean; // TODO make more granular?
		session: boolean;
		dependencies: Set<string>;
		parent: boolean;
	};
};

export type NavigationState = {
	branch: Array<BranchNode | undefined>;
	error: Error | null;
	params: Record<string, string>;
	session_id: number;
	url: URL;
};
