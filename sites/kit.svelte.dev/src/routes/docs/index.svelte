<script context="module">
	import { API_BASE } from '../../_env';

	export async function load({ fetch }) {
		const sections = await fetch(`${API_BASE}/docs/kit/docs?content`).then(r => r.json());
		return {
			props: { sections },
			maxage: 60
		};
	}
</script>

<script>
	import { Contents, Main, Section } from '@sveltejs/site-kit/docs';

	export let sections;

	let path;

	$: contents = sections.map(section => ({
		path: `/docs#${section.slug}`,
		title: section.title,
		sections: section.sections.map(subsection => ({
			path: `/docs#${subsection.slug}`,
			title: subsection.title,
			sections: subsection.sections.map(subsection => ({
				path: `/docs#${subsection.slug}`,
				title: subsection.title,
			}))
		}))
	}));
</script>

<svelte:head>
	<title>Docs • SvelteKit</title>

	<meta name="twitter:title" content="SvelteKit docs" />
	<meta name="twitter:description" content="Complete documentation for SvelteKit" />
	<meta name="Description" content="Complete documentation for SvelteKit" />
</svelte:head>

<Main bind:path>
	<h1>Documentation</h1>

	{#each sections as section}
		<Section
			{section}
			edit="https://github.com/sveltejs/kit/edit/master/documentation/docs/{section.file}"
			base="/docs"
		/>
	{/each}
</Main>

<Contents {contents} {path} />
