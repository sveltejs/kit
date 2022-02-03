<script context="module">
	export const prerender = true;
</script>

<script>
	import { Contents, Main, Section } from '@sveltejs/site-kit/docs';

	export let sections;

	let path;

	$: contents = sections.map((section) => ({
		path: `/migrating#${section.slug}`,
		title: section.title,
		sections: section.sections.map((subsection) => ({
			path: `/migrating#${subsection.slug}`,
			title: subsection.title,
			sections: subsection.sections.map((subsection) => ({
				path: `/migrating#${subsection.slug}`,
				title: subsection.title
			}))
		}))
	}));
</script>

<svelte:head>
	<title>Migration • SvelteKit</title>

	<meta name="twitter:title" content="SvelteKit migration guides" />
	<meta name="twitter:description" content="How to migrate your app from Sapper to SvelteKit" />
	<meta name="description" content="How to migrate your app from Sapper to SvelteKit" />
</svelte:head>

<Main bind:path>
	<h1>Migration</h1>

	{#each sections as section}
		<Section
			{section}
			edit="https://github.com/sveltejs/kit/edit/master/documentation/migrating/{section.file}"
			base="/docs"
		/>
	{/each}
</Main>

<Contents {contents} {path} />
