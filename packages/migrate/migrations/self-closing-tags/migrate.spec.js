import { assert, test } from 'vitest';
import * as compiler from 'svelte/compiler';
import { remove_self_closing_tags } from './migrate.js';

/** @type {Record<string, string>} */
const tests = {
	'<div/>': '<div></div>',
	'<div />': '<div></div>',
	'<custom-element />': '<custom-element></custom-element>',
	'<div class="foo"/>': '<div class="foo"></div>',
	'<div class="foo" />': '<div class="foo"></div>',
	'\t<div\n\t\tonclick={blah}\n\t/>': '\t<div\n\t\tonclick={blah}\n\t></div>',
	'<foo-bar/>': '<foo-bar></foo-bar>',
	'<link/>': '<link/>',
	'<link />': '<link />',
	'<svg><g /></svg>': '<svg><g /></svg>',
	'<slot />': '<slot />',
	'<svelte:options customElement="my-element" /><slot />':
		'<svelte:options customElement="my-element" /><slot></slot>',
	'<svelte:options namespace="foreign" /><foo />': '<svelte:options namespace="foreign" /><foo />',
	'<script>console.log("<div />")</script>': '<script>console.log("<div />")</script>',
	'<script lang="ts">let a: string = ""</script><div />':
		'<script lang="ts">let a: string = ""</script><div></div>',
	'<div><i/></div>': '<div><i></i></div>'
};

for (const input in tests) {
	test(input, async () => {
		const output = tests[input];
		assert.equal(await remove_self_closing_tags(compiler, input), output);
	});
}
