<script>
	const { children } = $props();
</script>

<svelte:head>
	<title>SvelteKit benchmark</title>
	<meta name="description" content="Deterministic fixture for SvelteKit benchmark seeds" />
</svelte:head>

<div class="shell">
	<header class="hero">
		<h1>SvelteKit benchmark</h1>
		<p>Small, deterministic seed app for sync, build, and SSR measurements.</p>
	</header>

	<main>
		{@render children?.()}
	</main>
</div>

<style>
	:global(body) {
		margin: 0;
		font-family: system-ui, sans-serif;
		background: #f8fafc;
		color: #0f172a;
	}

	.shell {
		max-width: 72rem;
		margin: 0 auto;
		padding: 2rem;
	}

	.hero {
		margin-bottom: 2rem;
	}

	h1,
	p {
		margin: 0;
	}

	.hero p {
		margin-top: 0.5rem;
		color: #475569;
	}
</style>
