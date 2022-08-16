<script>
	import Contents from '$lib/docs/Contents.svelte';

	/** @type {import('./$types').LayoutData} */
	export let data;

	$: contents = data.sections.map((section) => ({
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

<div class="grid">
	<slot />
	<div class="toc-container">
		<Contents {contents} />
	</div>
</div>

<style>
	@media (min-width: 832px) {
		.grid {
			grid-template-rows: unset;
			grid-template-columns: var(--sidebar-w) 1fr;
		}

		.toc-container {
			width: var(--sidebar-w);
			height: 100vh;
			overflow: auto;
			position: fixed;
			left: 0;
			top: 0;
		}
	}
</style>
