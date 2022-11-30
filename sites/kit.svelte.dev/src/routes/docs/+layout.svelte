<script>
	import Contents from '$lib/docs/Contents.svelte';

	/** @type {import('./$types').LayoutData} */
	export let data;
</script>

<div class="container">
	<div class="page">
		<slot />
	</div>

	<div class="toc-container">
		<Contents contents={data.sections} />
	</div>
</div>

<style>
	.container {
		--sk-page-sidebar-width: 30rem;
		--on-this-page-left: auto;
		--on-this-page-right: 0;
	}

	.page {
		--on-this-page-width: 280px;
		--on-this-page-display: none;
		padding: var(--sk-page-padding-top) var(--sk-page-padding-side);
	}

	@media (min-width: 832px) {
		.toc-container {
			width: var(--sk-page-sidebar-width);
			height: 100vh;
			overflow: auto;
			position: fixed;
			left: 0;
			top: 0;
		}

		.toc-container::before {
			content: '';
			position: fixed;
			width: 0;
			height: 100%;
			top: 0;
			left: calc(var(--sk-page-sidebar-width) - 1px);
			border-right: 1px solid var(--sk-back-3);
		}

		.page {
			padding-left: calc(var(--sk-page-sidebar-width) + var(--sk-page-padding-side));
		}
	}

	@media (min-width: 1320px) {
		.container {
			--sk-page-sidebar-width: max(30rem, 30vw);
		}

		.page {
			--on-this-page-display: block;
			padding-right: calc(var(--on-this-page-width) + var(--sk-page-padding-side));
			margin: 0 auto;
		}
	}

	@media (min-width: 1464px) {
		.page {
			--on-this-page-left: calc(
				var(--sk-page-sidebar-width) + var(--sk-line-max-width) + 2 * var(--sk-page-padding-side)
			);
			--on-this-page-right: auto;
		}
	}
</style>
