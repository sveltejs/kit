<script context="module">
	export const prerender = true;

	// TODO should use a shadow endpoint instead, need to fix a bug first
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ fetch, params }) {
		const res = await fetch(`/docs/${params.slug}.json`);
		const { section } = await res.json();

		return {
			props: {
				section
			}
		};
	}
</script>

<script>
	import { Icon } from '@sveltejs/site-kit';
	import '@sveltejs/site-kit/code.css';
	import './_/docs.css';

	export let section;
</script>

<svelte:head>
	<title>{section.title} • Docs • SvelteKit</title>

	<meta name="twitter:title" content="SvelteKit docs" />
	<meta name="twitter:description" content="{section.title} • SvelteKit documentation" />
	<meta name="Description" content="{section.title} • SvelteKit documentation" />
</svelte:head>

<div class="content listify">
	<h1>{section.title}</h1>

	<a href="https://github.com/sveltejs/kit/edit/master/documentation/docs/{section.file}">
		<Icon size={50} name="edit" /> Edit this page on GitHub
	</a>

	<section>
		{@html section.content}
	</section>
</div>

<style>
	a {
		font-size: 1.4rem;
		line-height: 1;
	}

	a :global(.icon) {
		position: relative;
		top: -0.1rem;
		left: 0.3rem;
		inline-size: 1.4rem;
		block-size: 1.4rem;
		margin-inline-end: 0.5rem;
	}
</style>
