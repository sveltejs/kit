import { PageNode } from 'types';

interface Part {
	content: string;
	dynamic: boolean;
	rest: boolean;
	type: string | null;
}

interface RouteTreeNode {
	error: PageNode | undefined;
	layouts: Record<string, PageNode>;
}

export type RouteTree = Map<string, RouteTreeNode>;

interface RouteComponent {
	kind: 'component';
	is_page: boolean;
	is_layout: boolean;
	is_error: boolean;
	uses_layout: string | undefined;
	declares_layout: string | undefined;
}

interface RouteSharedModule {
	kind: 'shared';
	is_page: boolean;
	is_layout: boolean;
	declares_layout: string | undefined;
}

interface RouteServerModule {
	kind: 'server';
	is_page: boolean;
	is_layout: boolean;
	declares_layout: string | undefined;
}

export type RouteFile = RouteComponent | RouteSharedModule | RouteServerModule;
