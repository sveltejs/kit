/** @import { Component } from 'svelte'; */
/** @import { Page } from '@sveltejs/kit'; */

import { noop } from '../utils/functions.js';

export class Props {
	/** @type {Page} */
	page;

	/**
	 * An array of the `+layout.svelte` and `+page.svelte` component instances
	 * that currently live on the page — used for capturing and restoring snapshots.
	 * It's updated/manipulated through `bind:this` in `Root.svelte`.
	 * @type {Array<Record<string, any>>}
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
	 * @param {Page} page
	 * @param {RenderNode} tree
	 * @param {(error: unknown, reset: () => void) => void} onerror
	 */
	constructor(page, tree, onerror = noop) {
		this.page = page;
		this.tree = tree;
		this.onerror = onerror;

		this.form = $state.raw();
		this.error = $state.raw();
	}
}

export class RenderNode {
	/** @type {Component} */
	component;

	/** @type {Component | undefined} */
	error;

	/** @type {Record<string, any>} */
	data = $state.raw({});

	/** @type {RenderNode | undefined} */
	child = $state.raw();

	/**
	 *
	 * @param {Component} component
	 * @param {Component} error
	 */
	constructor(component, error) {
		this.component = component;
		this.error = error;
	}
}
