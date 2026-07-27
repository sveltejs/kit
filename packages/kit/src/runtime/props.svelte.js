/** @import { Component } from 'svelte'; */
/** @import { Page } from '@sveltejs/kit'; */

export class Props {
	/** @type {Page} */
	page;

	/** @type {Array<Record<string, any>>} */
	components;

	/** @type {any} */
	form;

	/** @type {App.Error | undefined} */
	error;

	/** @type {RenderNode} */
	tree;

	/** @type {(error: unknown, reset: () => void) => void} */
	onerror;

	/**
	 * @param {Page} page
	 * @param {Array<Record<string, any>>} components
	 * @param {(error: unknown, reset: () => void) => void} onerror
	 * @param {RenderNode} tree
	 */
	constructor(page, components, onerror, tree) {
		this.page = page;
		this.components = components;
		this.form = $state.raw();
		this.error = $state.raw();
		this.tree = tree;

		this.onerror = onerror;
	}
}

export class RenderNode {
	/** @type {Component} */
	component;

	/** @type {Component | undefined} */
	error;

	/** @type {Record<string, any>} */
	data;

	/** @type {RenderNode | null} */
	child;

	/**
	 *
	 * @param {Component} component
	 * @param {Component} error
	 */
	constructor(component, error) {
		this.component = component;
		this.error = error;

		this.data = $state.raw({});
		this.child = $state.raw(null);
	}
}
