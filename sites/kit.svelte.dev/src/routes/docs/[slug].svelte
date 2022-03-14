<script context="module">
	export const prerender = true;

	// TODO should use a shadow endpoint instead, need to fix a bug first
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ fetch, params }) {
		const res = await fetch(`/docs/${params.slug}.json`);
		const { prev, next, section } = await res.json();

		return {
			props: {
				prev,
				next,
				section
			}
		};
	}
</script>

<script>
	import { Icon } from '@sveltejs/site-kit';
	import '@sveltejs/site-kit/code.css';
	import '$lib/docs/client/docs.css';
	import '$lib/docs/client/shiki.css';
	import * as hovers from '$lib/docs/client/hovers.js';

	export let prev;
	export let next;
	export let section;

	hovers.setup();
</script>

<svelte:head>
	<title>{section.title} • Docs • SvelteKit</title>

	<meta name="twitter:title" content="SvelteKit docs" />
	<meta name="twitter:description" content="{section.title} • SvelteKit documentation" />
	<meta name="Description" content="{section.title} • SvelteKit documentation" />
</svelte:head>

<div class="content listify">
	<h1>{section.title}</h1>

	<a class="edit" href="https://github.com/sveltejs/kit/edit/master/documentation/{section.file}">
		<Icon size={50} name="edit" /> Edit this page on GitHub
	</a>

	<section>
		{@html section.content}
	</section>

	<div class="controls">
		<div>
			<span class:faded={!prev}>previous</span>
			{#if prev}
				<a href="/docs/{prev.slug}">{prev.title}</a>
			{/if}
		</div>

		<div>
			<span class:faded={!next}>next</span>
			{#if next}
				<a href="/docs/{next.slug}">{next.title}</a>
			{/if}
		</div>
	</div>
</div>

<style>
	.edit {
		position: relative;
		font-size: 1.4rem;
		line-height: 1;
		z-index: 2;
	}

	.edit :global(.icon) {
		position: relative;
		top: -0.1rem;
		left: 0.3rem;
		width: 1.4rem;
		height: 1.4rem;
		margin-right: 0.5rem;
	}

	.controls {
		max-width: calc(var(--linemax) + 1rem);
		border-top: 1px solid #eee;
		padding: 1rem 0 0 0;
		display: grid;
		grid-template-columns: 1fr 1fr;
		margin: 6rem 0 0 0;
	}

	.controls > :first-child {
		text-align: left;
	}

	.controls > :last-child {
		text-align: right;
	}

	.controls span {
		display: block;
		font-size: 1.2rem;
		text-transform: uppercase;
		font-weight: 600;
		color: var(--second);
	}

	.controls span.faded {
		opacity: 0.4;
	}
</style>
