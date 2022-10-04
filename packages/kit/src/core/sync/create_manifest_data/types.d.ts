import { PageNode } from 'types';

interface RouteTreeNode {
	error: PageNode | undefined;
	layout: PageNode | undefined;
}

export type RouteTree = Map<string, RouteTreeNode>;

interface RouteComponent {
	kind: 'component';
	is_page: boolean;
	is_layout: boolean;
	is_error: boolean;
	uses_layout: string | undefined;
}

interface RouteSharedModule {
	kind: 'shared';
	is_page: boolean;
	is_layout: boolean;
}

interface RouteServerModule {
	kind: 'server';
	is_page: boolean;
	is_layout: boolean;
}

export type RouteFile = RouteComponent | RouteSharedModule | RouteServerModule;
