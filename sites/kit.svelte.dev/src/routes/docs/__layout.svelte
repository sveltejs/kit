<script context="module">
	export const prerender = true;

	export async function load({ fetch }) {
		const res = await fetch('/docs/sections.json');

		return {
			props: {
				sections: await res.json()
			}
		};
	}
</script>

<script>
	import Contents from './_/Contents.svelte';

	export let sections;

	$: contents = sections.map((section) => ({
		path: `/docs/${section.slug}`,
		title: section.title,
		sections: section.sections.map((subsection) => ({
			path: `/docs/${section.slug}#${subsection.slug}`,
			title: subsection.title,
			sections: subsection.sections.map((subsection) => ({
				path: `/docs/${section.slug}#${subsection.slug}`,
				title: subsection.title
			}))
		}))
	}));
</script>

<slot />

<Contents {contents} />
