<script>
	import Section from '@sveltejs/site-kit/components/Section.svelte';
</script>

<Section --background="radial-gradient(circle at 40% 30%, rgb(110, 113, 118), rgb(81, 93, 106))">
	<div class="try">
		<pre><code
				>npm create <span class="orange-highlight">svelte</span>@latest my-app
cd my-app
npm install
npm run dev -- --open</code
			></pre>

		<p>or <a href="https://sveltekit.new">create an app on StackBlitz</a></p>
	</div>
</Section>

<style>
	.try {
		width: 30ch;
		margin: 0 auto;
		font-size: var(--sk-text-m);
		color: white;
	}

	.try *::selection {
		background: hsl(15, 100%, 65%);
		color: white;
	}

	pre {
		height: 100%;
		display: flex;
		flex-direction: column;
		margin: 0 0 2rem 0;
		filter: drop-shadow(0 0 2rem rgba(255, 255, 255, 0.8));
	}

	pre code {
		color: white;
		font-size: 1em;
	}

	.orange-highlight,
	a {
		color: hsl(15, 100%, 65%);
	}
</style>
