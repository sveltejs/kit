<script>
	import Section from '@sveltejs/site-kit/components/Section.svelte';
</script>

<Section --background="var(--sk-theme-2)">
	<div class="grid" style="--columns: 2">
		<h2>see for yourself</h2>
		<div class="try">
			<pre><code
					>npm create <span class="orange-highlight">svelte</span>@latest my-app
cd my-app
npm install
npm run dev -- --open</code
				></pre>

			<p>or <a href="https://sveltekit.new">create an app on StackBlitz</a></p>
		</div>
	</div>
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

	pre {
		margin: 1em 0 2em 0;
	}

	pre code {
		color: white;
		font-size: 1em;
	}

	.orange-highlight,
	a {
		color: hsl(15, 100%, 65%);
	}

	@media (min-width: 900px) {
		h2 {
			order: 2;
			font-size: var(--sk-text-xxl);
			display: flex;
			align-items: center;
		}
	}
</style>
