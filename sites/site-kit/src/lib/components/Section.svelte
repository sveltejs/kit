<section>
	<slot />
</section>

<style>
	section {
		position: relative;
		margin: 0 auto 0 auto;
		padding: 10rem var(--sk-page-padding-side);
		max-width: 120rem;
	}

	section :global(h3) {
		color: var(--sk-text-2);
	}
</style>
