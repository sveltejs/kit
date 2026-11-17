<script>
	/** @type {{ children?: import('svelte').Snippet }} */
	let { children } = $props();
</script>

<div class="frame">
	<header>
		<p class="kicker">experimental @sveltejs/enhanced-fonts</p>
		<nav>
			<a href="/">Home</a>
			<a href="/about">About</a>
			<a href="/display">Display</a>
		</nav>
	</header>

	<main>
		{@render children?.()}
	</main>
</div>

<style>
	:global(body) {
		margin: 0;
		background: #f6f1e8;
		color: #1b1712;
	}

	.frame {
		max-width: 42rem;
		margin: 0 auto;
		padding: 2rem 1.25rem 4rem;
	}

	.kicker {
		margin: 0 0 0.75rem;
		font:
			600 0.75rem/1.2 ui-sans-serif,
			system-ui,
			sans-serif;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #6a5d4e;
	}

	nav {
		display: flex;
		gap: 1rem;
		margin-bottom: 2rem;
		font:
			600 1rem/1.4 ui-sans-serif,
			system-ui,
			sans-serif;
	}

	nav a {
		color: #214e3a;
	}
</style>
