import { applyAction } from '$app/forms';
import {
	afterNavigate,
	beforeNavigate,
	goto,
	invalidate,
	invalidateAll,
	preloadCode,
	preloadData
} from '$app/navigation';
import { SvelteComponent } from 'svelte';
import { CSRPageNode, CSRPageNodeLoader, CSRRoute, Page, TrailingSlash, Uses } from 'types';

export interface Client {
	// public API, exposed via $app/navigation
	after_navigate: typeof afterNavigate;
	before_navigate: typeof beforeNavigate;
	disable_scroll_handling(): void;
	goto: typeof goto;
	invalidate: typeof invalidate;
	invalidateAll: typeof invalidateAll;
	preload_code: typeof preloadCode;
	preload_data: typeof preloadData;
	apply_action: typeof applyAction;

	// private API
	_hydrate(opts: {
		status: number;
		error: App.Error | null;
		node_ids: number[];
		params: Record<string, string>;
		route: { id: string | null };
		data: Array<import('types').ServerDataNode | null>;
		form: Record<string, any> | null;
	}): Promise<void>;
	_start_router(): void;
}

export type NavigationIntent = {
	/** `url.pathname + url.search`  */
	id: string;
	/** Whether we are invalidating or navigating */
	invalidating: boolean;
	/** The route parameters */
	params: Record<string, string>;
	/** The route that matches `path` */
	route: CSRRoute;
	/** The destination URL */
	url: URL;
};

export type NavigationResult = NavigationRedirect | NavigationFinished;

export type NavigationRedirect = {
	type: 'redirect';
	location: string;
};

export type NavigationFinished = {
	type: 'loaded';
	state: NavigationState;
	props: {
		components: Array<typeof SvelteComponent>;
		page?: Page;
		form?: Record<string, any> | null;
		[key: `data_${number}`]: Record<string, any>;
	};
};

export type BranchNode = {
	node: CSRPageNode;
	loader: CSRPageNodeLoader;
	server: DataNode | null;
	universal: DataNode | null;
	data: Record<string, any> | null;
	slash?: TrailingSlash;
};

export interface DataNode {
	type: 'data';
	data: Record<string, any> | null;
	uses: Uses;
	slash?: TrailingSlash;
}

export interface NavigationState {
	branch: Array<BranchNode | undefined>;
	error: App.Error | null;
	params: Record<string, string>;
	route: CSRRoute | null;
	url: URL;
}
