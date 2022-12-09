<section>
	<div class="inner"><slot /></div>
</section>

<style>
	section {
		padding: 6rem 0;
		background: var(--background, white);
	}

	section::after {
		content: '';
		display: table;
		clear: both;
	}

	.inner {
		max-width: 120rem;
		padding: 0 var(--side-nav);
		margin: 0 auto;
	}

	@media (min-width: 900px) {
		section {
			padding: 10rem 0;
		}
	}
</style>
