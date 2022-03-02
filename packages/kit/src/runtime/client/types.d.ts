import {
	afterNavigate,
	beforeNavigate,
	goto,
	invalidate,
	prefetch,
	prefetchRoutes
} from '$app/navigation';
import { CSRComponent, CSRRoute, NormalizedLoadOutput } from 'types';

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
		nodes: Array<Promise<CSRComponent>>;
		params: Record<string, string>;
	}) => Promise<void>;
	_start_router: () => void;
}

export type NavigationIntent = {
	/**
	 * `url.pathname + url.search`
	 */
	id: string;
	/**
	 * `url.pathname`, minus any `paths.base` prefix
	 */
	path: string;
	/**
	 * The routes that could satisfy this navigation intent
	 */
	routes: CSRRoute[];
	/**
	 * The destination URL
	 */
	url: URL;
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
