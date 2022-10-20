<script>
	import Contents from '$lib/docs/Contents.svelte';
	import OnThisPage from '$lib/docs/OnThisPage.svelte';

	/** @type {import('./$types').LayoutData} */
	export let data;

	$: contents = data.sections.map((section) => ({
		title: section.title,
		sections: section.sections.map((subsection) => ({
			path: `/docs/${subsection.slug}`,
			title: subsection.title
		}))
	}));

	$: page_contents = data.page_sections.map((section) => ({
		title: section.title,
		anchor: section.slug
	}));
</script>

<div class="grid">
	<slot />
	<div class="toc-container">
		<Contents {contents} />
	</div>
	<div class="otp-container">
		<OnThisPage {page_contents} />
	</div>
</div>

<style>
	.otp-container {
		display: none;
	}

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

	@media (min-width: 1300px) {
		.otp-container {
			display: block;
			width: calc(var(--sidebar-w) - 15px); /* substract scrollbar */
			height: 100vh;
			overflow: auto;
			position: fixed;
			right: 0;
			top: 0;
			padding: var(--top-offset) 3.2rem;
			background-color: var(--code-bg);
		}
	}
</style>
