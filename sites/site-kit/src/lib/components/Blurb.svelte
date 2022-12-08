<script>
	import Section from './Section.svelte';
</script>

<Section>
	<div class="blurb">
		<div class="box one">
			<slot name="one" />
		</div>

		<div class="box two">
			<slot name="two" />
		</div>

		<div class="box three">
			<slot name="three" />
		</div>

		<div class="what">
			<slot name="what" />
		</div>

		<div class="how">
			<slot name="how" />
		</div>
	</div>
</Section>

<style>
	.blurb {
		display: grid;
		grid-row-gap: 1em;
		grid-template-areas:
			'one'
			'two'
			'three'
			'what'
			'how';
	}

	.box {
		padding: 1em;
		display: flex;
		flex-direction: column;
		border-bottom: none;
		color: var(--back);
		border-radius: var(--sk-border-radius);
	}

	.how {
		padding: 1em;
		border-radius: var(--sk-border-radius);
	}

	.how :global(pre) {
		margin: 0 0 1em 0;
	}

	.how :global(code) {
		font-size: 16px;
		line-height: 1.5;
	}

	.box > :global(div),
	.how > :global(div) {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.box :global(p) {
		flex: 1;
	}

	.box :global(.cta),
	.how :global(.cta) {
		position: relative;
		max-width: 15em;
		padding: 0.8rem 1.6rem;
		border-radius: 4px;
		background: white;
		border: 1px solid white;
		color: #222;
		font-size: var(--sk-text-xs);
		text-decoration: none;
	}

	.how :global(.cta) {
		border: 1px solid var(--sk-theme-1-variant);
		background-color: var(--sk-theme-1-variant);
		color: var(--sk-back-1);
	}

	.box :global(.cta):hover {
		background: transparent;
		color: var(--back);
	}

	.how :global(.cta):hover {
		/* border: 1px solid var(--sk-theme-1); */
		background-color: transparent;
		color: var(--sk-theme-1);
	}

	.box :global(.cta)::after,
	.how :global(.cta)::after {
		content: '';
		position: absolute;
		display: block;
		right: 0.5em;
		top: 0em;
		width: 1em;
		height: 100%;
		background: url(../icons/arrow-right-black.svg);
		background-size: 100% 100%;
	}

	.how :global(.cta)::after {
		background-image: url(../icons/arrow-right.svg);
	}

	.blurb :global(.cta):hover::after {
		background-image: url(../icons/arrow-right.svg);
	}

	.how :global(.cta):hover::after {
		background-image: url(../icons/arrow-right-prime.svg);
	}

	.box :global(h2) {
		padding: 0;
		font-size: var(--sk-text-l);
		font-weight: 300;
		color: white;
	}

	.blurb :global(p) {
		font-size: var(--sk-text-s);
		margin: 1em 0;
		color: white;
	}

	.blurb .box :global(p) :global(a) {
		color: white;
		text-decoration: underline;
	}

	.one {
		background: var(--sk-theme-1-variant);
		grid-area: one;
	}

	.two {
		background: var(--sk-theme-3-variant);
		grid-area: two;
	}

	.three {
		background: var(--sk-theme-2-variant);
		grid-area: three;
	}

	.how {
		/* needed to prevent the <pre> from
		   breaking the grid layout */
		min-width: 0;
		grid-area: how;
		background: var(--sk-back-3);
		box-shadow: inset 1px 1px 3px rgba(81, 81, 81, 0.2);
	}

	.what {
		margin: 2em 0 0 0;
		grid-area: what;
	}

	.what :global(p) {
		color: var(--sk-text-2);
	}

	@media (min-width: 900px) {
		.blurb {
			grid-column-gap: 1em;
			grid-row-gap: 1em;
			grid-template-columns: repeat(2, 1fr);
			grid-template-areas:
				'one two'
				'three how'
				'what what';
		}

		.box,
		.how {
			padding: 2em;
		}
	}

	@media (min-width: 1200px) {
		.blurb {
			grid-column-gap: 1em;
			grid-row-gap: 5em;
			grid-template-columns: repeat(6, 1fr);
			grid-template-areas:
				'one one two two three three'
				'what what what how how how';
		}

		.what {
			margin: 0;
		}
	}
</style>
