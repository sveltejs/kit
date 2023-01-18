import { PageNode } from 'types';

interface Part {
	dynamic: boolean;
	optional: boolean;
	rest: boolean;
	type: string | null;
}

interface RouteTreeNode {
	error: PageNode | undefined;
	layout: PageNode | undefined;
}

export type RouteTree = Map<string, RouteTreeNode>;

interface RouteComponent {
	kind: 'component';
	type: 'page' | 'layout' | 'loading' | 'error';
	uses_layout: string | undefined;
}

interface RouteSharedModule {
	kind: 'universal';
	type: 'page' | 'layout';
}

interface RouteServerModule {
	kind: 'server';
	type: 'page' | 'layout' | 'endpoint';
}

export type RouteFile = RouteComponent | RouteSharedModule | RouteServerModule;
