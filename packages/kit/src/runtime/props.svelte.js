/** @import { Component } from 'svelte'; */
/** @import { Page } from '$app/state'; */

import { noop } from '../utils/functions.js';

export class Props {
	/** @type {Page} */
	page;

	/**
	 * An array of the `+layout.svelte` and `+page.svelte` component instances
	 * that currently live on the page — used for capturing and restoring snapshots.
	 * It's updated/manipulated through `bind:this` in `Root.svelte`.
	 * @type {Array<Record<string, any>>}
	 * @deprecated only used for `export const snapshot` — TODO 4.0 get rid
	 */
	components = [];

	/** @type {any} */
	form;

	/** @type {App.Error | undefined} */
	error;

	/** @type {RenderNode} */
	tree;

	/** @type {(error: unknown, reset: () => void) => void} */
	onerror;

	/**
	 * @param {{
	 *   page: Page;
	 *   tree: RenderNode;
	 *   form: any;
	 *   error: App.Error | undefined;
	 *   onerror?: (error: unknown, reset: () => void) => void;
	 * }} props
	 */
	constructor({ page, tree, form, error, onerror = noop }) {
		this.page = page;
		this.tree = tree;
		this.onerror = onerror;

		this.form = $state.raw(form);
		this.error = $state.raw(error);
	}
}

export class RenderNode {
	/** @type {Component} */
	component;

	/** @type {Component | undefined} */
	error;

	/** @type {Record<string, any>} */
	data;

	/** @type {RenderNode | undefined} */
	child;

	/**
	 *
	 * @param {Component} component
	 * @param {Component | undefined} error
	 * @param {Record<string, any>} [data]
	 * @param {RenderNode} [child]
	 */
	constructor(component, error, data = {}, child = undefined) {
		this.component = component;
		this.error = error;
		this.data = $state.raw(data);
		this.child = $state.raw(child);
	}
}

/**
 * Initialize reactive fields with their final values, rather than mutating an empty
 * tree. Otherwise async rendering can read the empty tree from an earlier batch.
 * @param {Array<Pick<RenderNode, 'component' | 'error' | 'data'>>} nodes
 * @returns {RenderNode}
 */
export function create_render_tree(nodes) {
	/** @type {RenderNode | undefined} */
	let tree;

	for (let i = nodes.length - 1; i >= 0; i -= 1) {
		const { component, error, data } = nodes[i];
		tree = new RenderNode(component, error, data, tree);
	}

	return /** @type {RenderNode} */ (tree);
}
