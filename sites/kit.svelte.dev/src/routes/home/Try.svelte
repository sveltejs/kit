<script>
	import { Section, TryTerminal } from '@sveltejs/site-kit/components';
</script>

<Section --background="var(--background-2)">
	<div class="grid" style="--columns: 2">
		<h2>
			<svg viewBox="0 0 24 24">
				<path
					d="M6 11.9958H18"
					stroke="white"
					fill="none"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
				<path
					d="M12 18L6 12L12 6"
					stroke="white"
					fill="none"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>

			see for yourself
		</h2>
		<div class="try">
			<TryTerminal />
		</div>
	</div>
	<p class="create-an-app">
		...or
		<a target="_blank" rel="noreferrer" href="https://sveltekit.new"> create an app </a>
		on StackBlitz.
	</p>
</Section>

<style>
	.grid *::selection {
		background: hsl(15, 100%, 65%);
		color: white;
	}

	.try {
		width: 100%;
		margin: 0 auto;
		font-size: var(--sk-text-m);
		color: white;
	}

	h2 {
		color: white;
		font-size: var(--sk-text-xl);
	}

	svg {
		width: 1em;
		margin: 0 0.5em 0 0;
		display: none;
	}

	.create-an-app {
		color: white;
	}

	a {
		color: inherit;
		text-decoration: underline;
	}

	@media (min-width: 900px) {
		svg {
			display: initial;
		}
		h2 {
			order: 2;
			font-size: var(--sk-text-xxl);
			display: flex;
			align-items: center;
		}
	}
</style>
