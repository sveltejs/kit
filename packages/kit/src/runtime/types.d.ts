import { Component } from 'svelte';

export interface RenderNode {
	component: Component;
	error: Component;
	data: Record<string, any>;
	child?: RenderNode;
}
